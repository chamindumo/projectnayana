// src/services/visitorService.ts

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Visitor, HealthScreening } from '../types';
import {
  startOfDay as dateFnsStartOfDay,
  endOfDay as dateFnsEndOfDay,
} from 'date-fns';

export class VisitorService {
  private visitorsCollection = collection(db, 'visitors');
  private auditCollection = collection(db, 'audit_logs');

  // ──────────────────────────────────────────────────────────────
  // Helper: Safely convert Firestore doc → Visitor object
  // ──────────────────────────────────────────────────────────────
  private mapDocToVisitor(doc: any): Visitor {
    const data = doc.data();

    let healthScreening: HealthScreening | null = null;
    if (data.healthScreening) {
      healthScreening = {
        ...data.healthScreening,
        screeningDate: data.healthScreening.screeningDate?.toDate() || null,
      };
    }

    return {
      id: doc.id,
      fullName: data.fullName || '',
      phoneNumber: data.phoneNumber || '',
      photoURL: data.photoURL || null,
      residentName: data.residentName || '',
      roomNumber: data.roomNumber || '',
      purpose: data.purpose || '',
      visitorIdNumber: data.visitorIdNumber || '',
      checkInTime: data.checkInTime?.toDate() || null,
      checkOutTime: data.checkOutTime?.toDate() || null,
      status: data.status || 'checked-in',
      qrCode: data.qrCode || '',
      badgeNumber: data.badgeNumber || '',
      healthScreening: healthScreening, // can be null → no crash
      // add any other fields you save
    } as unknown as Visitor;
  }

  // ──────────────────────────────────────────────────────────────
  // Check-in
  // ──────────────────────────────────────────────────────────────
  async checkInVisitor(
    visitorData: Omit<Visitor, 'id' | 'checkInTime' | 'qrCode' | 'badgeNumber' | 'visitorIdNumber'> & { visitorIdNumber?: string },
    isReturningVisitor: boolean = false
  ): Promise<Visitor> {
    try {
      console.log('Check-in started for:', visitorData.fullName);

      let visitorIdNumber: string;
      let qrCode: string;
      let badgeNumber: string;

      if (isReturningVisitor && visitorData.visitorIdNumber) {
        visitorIdNumber = visitorData.visitorIdNumber;
        qrCode = this.generateQRCode(visitorIdNumber);
        badgeNumber = this.generateBadgeNumber();
      } else {
        visitorIdNumber = this.generateVisitorIdNumber();
        qrCode = this.generateQRCode(visitorIdNumber);
        badgeNumber = this.generateBadgeNumber();
      }

      const visitorPayload: any = {
        ...visitorData,
        visitorIdNumber,
        qrCode,
        badgeNumber,
        checkInTime: Timestamp.fromDate(new Date()),
        status: 'checked-in',
      };

      // Only add healthScreening if it exists
      if (visitorData.healthScreening) {
        visitorPayload.healthScreening = {
          ...visitorData.healthScreening,
          screeningDate: Timestamp.fromDate(visitorData.healthScreening.screeningDate || new Date()),
        };
      }

      const docRef = await addDoc(this.visitorsCollection, visitorPayload);

      await this.logAudit('visitor_check_in', 'system', docRef.id, {
        visitorName: visitorData.fullName,
        resident: visitorData.residentName,
        room: visitorData.roomNumber,
      });

      return this.mapDocToVisitor({ id: docRef.id, data: () => visitorPayload });
    } catch (error) {
      console.error('Check-in failed:', error);
      throw error;
    }
  }


  async getVisitorsByDateRange(startDate: Date, endDate: Date): Promise<Visitor[]> {
    try {
      const q = query(
        this.visitorsCollection,
        where('checkInTime', '>=', Timestamp.fromDate(dateFnsStartOfDay(startDate))),
        where('checkInTime', '<=', Timestamp.fromDate(dateFnsEndOfDay(endDate))),
        orderBy('checkInTime', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => this.mapDocToVisitor(d));
    } catch (error: any) {
      console.warn('Date range query failed (index missing?), falling back...', error);

      const all = await getDocs(this.visitorsCollection);
      return all.docs
        .map(d => this.mapDocToVisitor(d))
        .filter(v => v.checkInTime && v.checkInTime >= dateFnsStartOfDay(startDate) && v.checkInTime <= dateFnsEndOfDay(endDate))
        .sort((a, b) => (b.checkInTime?.getTime() || 0) - (a.checkInTime?.getTime() || 0));
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Check-out
  // ──────────────────────────────────────────────────────────────
  async checkOutVisitor(visitorId: string): Promise<void> {
    try {
      const visitorRef = doc(db, 'visitors', visitorId);
      await updateDoc(visitorRef, {
        checkOutTime: Timestamp.fromDate(new Date()),
        status: 'checked-out',
      });

      await this.logAudit('visitor_check_out', 'system', visitorId, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Get Active Visitors (currently inside)
  // ──────────────────────────────────────────────────────────────
  async getActiveVisitors(): Promise<Visitor[]> {
    try {
      const q = query(
        this.visitorsCollection,
        where('status', '==', 'checked-in'),
        orderBy('checkInTime', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.mapDocToVisitor(doc));
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Index missing, falling back...');
        const fallback = query(this.visitorsCollection, where('status', '==', 'checked-in'));
        const snapshot = await getDocs(fallback);
        const visitors = snapshot.docs.map(doc => this.mapDocToVisitor(doc));
        return visitors.sort((a, b) => (b.checkInTime?.getTime() || 0) - (a.checkInTime?.getTime() || 0));
      }
      console.error('getActiveVisitors error:', error);
      return [];
    }
  }



  // ──────────────────────────────────────────────────────────────
  // Get All Visitors from Today (for stats)
  // ──────────────────────────────────────────────────────────────
  async getTodayVisitors(): Promise<Visitor[]> {
    try {
      // Start of today (00:00:00.000)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Try efficient indexed query first
      const q = query(
        this.visitorsCollection,

        orderBy('checkInTime', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.mapDocToVisitor(doc));

    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Composite index missing. Falling back to client-side filtering...');

        // Fallback: Get ALL visitors and filter locally
        const allSnapshot = await getDocs(this.visitorsCollection);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayVisitors = allSnapshot.docs
          .map(doc => this.mapDocToVisitor(doc))
          .filter(visitor => {
            if (!visitor.checkInTime) return false;
            return visitor.checkInTime >= todayStart;
          })
          .sort((a, b) => {
            const timeA = a.checkInTime?.getTime() || 0;
            const timeB = b.checkInTime?.getTime() || 0;
            return timeB - timeA; // newest first
          });

        return todayVisitors;
      }

      console.error('getTodayVisitors error:', error);
      return [];
    }
  }
  // ──────────────────────────────────────────────────────────────
  // Real-time subscription to active visitors
  // ──────────────────────────────────────────────────────────────
  subscribeToActiveVisitors(callback: (visitors: Visitor[]) => void) {
    const q = query(
      this.visitorsCollection,
      where('status', '==', 'checked-in')
    );

    return onSnapshot(q, (snapshot) => {
      const visitors = snapshot.docs.map(doc => this.mapDocToVisitor(doc));
      visitors.sort((a, b) => (b.checkInTime?.getTime() || 0) - (a.checkInTime?.getTime() || 0));
      callback(visitors);
    }, (error) => {
      console.error('Realtime subscription error:', error);
      callback([]);
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Find visitor by ID number or QR code
  // ──────────────────────────────────────────────────────────────
  async findVisitorByIdNumber(visitorIdNumber: string): Promise<Visitor | null> {
    try {
      const q = query(this.visitorsCollection, where('visitorIdNumber', '==', visitorIdNumber));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return this.mapDocToVisitor(snapshot.docs[0]);
    } catch (error) {
      console.error('Find by ID error:', error);
      return null;
    }
  }

  async findVisitorByQRCode(qrCodeData: string): Promise<Visitor | null> {
    try {
      const parsed = JSON.parse(qrCodeData);
      const id = parsed.id || parsed.visitorId;
      if (id) return this.findVisitorByIdNumber(id);
      return null;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Emergency evacuation
  // ──────────────────────────────────────────────────────────────
  async emergencyEvacuation(visitorIds: string[]): Promise<void> {
    const promises = visitorIds.map(id =>
      updateDoc(doc(db, 'visitors', id), {
        status: 'emergency-evacuated',
        checkOutTime: Timestamp.fromDate(new Date()),
      })
    );
    await Promise.all(promises);
  }

  // ──────────────────────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────────────────────
  private generateVisitorIdNumber(): string {
    return `VID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  private generateQRCode(visitorIdNumber: string): string {
    return JSON.stringify({ t: 'v', id: visitorIdNumber, ts: Date.now() });
  }

  private generateBadgeNumber(): string {
    return `B${Date.now().toString().slice(-6)}`;
  }

  private async logAudit(action: string, userId: string, visitorId: string, details: any) {
    try {
      await addDoc(this.auditCollection, {
        timestamp: Timestamp.fromDate(new Date()),
        action,
        userId,
        visitorId: visitorId,
        details,
      });
    } catch (e) {
      console.warn('Audit log failed', e);
    }
  }

  // Test DB connection (optional debug)
  async testDatabaseConnection() {
    try {
      const testRef = await addDoc(this.visitorsCollection, { test: true, ts: Timestamp.now() });
      await updateDoc(testRef, { test: false });
      return { success: true, message: 'Database OK' };
    } catch (e: any) {
      console.error('testDatabaseConnection error:', e);
      return { success: false, message: e.message };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Get ALL Visitors (for backup)
  // ──────────────────────────────────────────────────────────────
  async getAllVisitors(): Promise<Visitor[]> {
    try {
      const snapshot = await getDocs(this.visitorsCollection);
      return snapshot.docs.map(doc => this.mapDocToVisitor(doc));
    } catch (error) {
      console.error('getAllVisitors error:', error);
      return [];
    }
  }

  async getAllAuditLogs(): Promise<any[]> {
    try {
      const snapshot = await getDocs(this.auditCollection);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || null
      }));
    } catch (error) {
      console.error('getAllAuditLogs error:', error);
      return [];
    }
  }
}

export const visitorService = new VisitorService();
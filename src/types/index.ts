export interface Visitor {
  roomNumber: string;
  phoneNumber: string;
  fullName: any;
  id: string;
  visitorIdNumber: string; // Unique ID number for the visitor
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  residentName: string;
  residentRoom: string;
  checkInTime: Date;
  checkOutTime?: Date;
  healthScreening: HealthScreening;
  emergencyContact: string;
  emergencyPhone: string;
  photoUrl?: string;
  badgeNumber: string;
  status: 'checked-in' | 'checked-out' | 'emergency-evacuated';
  accessLevel: 'family' | 'friend' | 'professional' | 'volunteer' | 'contractor';
  qrCode: string;
  isApproved: boolean;
  notes?: string;
  // New fields for enhanced visitor management
  visitorMeetingSelection: 'resident' | 'staff' | 'sisters';
  visitorCategory?: string; // For resident categories (Power of Attorney, Family Member, etc.)
  visitorCategoryOther?: string; // Text input for "Other" category
  staffDepartment?: string; // For staff departments
  visitPurpose: string;
  visitPurposeOther?: string; // Text input for "Other" visit purpose
  appointmentType: 'scheduled' | 'walk-in';
  appointmentTime?: string; // For scheduled appointments
  // Family members
  familyMembers?: FamilyMember[];
  isFamilyGroup: boolean;
  // For check-out flow
  isFamilyMember?: boolean;
  familyMemberData?: FamilyMember;
}

export interface HealthScreening {
  testResult: string;
  temperature?: number;
  hasSymptoms: boolean;
  symptoms: string[];
  riskFactors: string[];
  screeningDate: Date;
  // Required health screening fields
  noFeverOrCovidSymptoms: boolean;
  notInContactWithIll: boolean;
  visitorAgreementAcknowledgement: boolean;
}

export interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  building: string;
  emergencyContact: string;
  approvedVisitors: string[];
  visitingHours: {
    start: string;
    end: string;
  };
  specialInstructions?: string;
  medicalRestrictions?: string[];
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  userId: string;
  visitorId?: string;
  details: Record<string, any>;
  ipAddress: string;
}

export interface EmergencySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  type: 'fire' | 'medical' | 'security' | 'weather' | 'other';
  description: string;
  evacuatedVisitors: string[];
  isActive: boolean;
}

// User Management Types
export type UserRole = 'super-admin' | 'admin' | 'hierarchy-person' | 'front-desk';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  permissions: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  age?: number;
  phone?: string;
  email?: string;
  badgeNumber: string;
  visitorId: string;
  checkInTime: Date;
  checkOutTime?: Date;
}

export interface NameTagData {
  visitorName: string;
  residentName: string;
  date: string;

}
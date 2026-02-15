import { visitorService } from './visitorService';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase/config';

// Types for Google API
declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '12eMUfGNPfoad-Plp_3GndFIg4G8o02Q1';

export class GoogleDriveService {
    private tokenClient: any;
    private accessToken: string | null = null;
    private tokenExpiration: number = 0;

    constructor() {
        this.accessToken = localStorage.getItem('gdrive_access_token');
        const expiry = localStorage.getItem('gdrive_token_expiry');
        if (expiry) {
            this.tokenExpiration = parseInt(expiry, 10);
        }
    }

    getClientId(): string | null {
        console.log('getClientId', localStorage.getItem('gdrive_client_id'));
        return localStorage.getItem('gdrive_client_id');
    }

    isTokenValid(): boolean {
        return !!this.accessToken && Date.now() < this.tokenExpiration;
    }

    async init(clientId: string) {
        return new Promise<void>((resolve, reject) => {
            const checkGoogle = setInterval(() => {
                if (window.google && window.google.accounts) {
                    clearInterval(checkGoogle);
                    try {
                        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                            client_id: clientId,
                            scope: SCOPES,
                            callback: (tokenResponse: any) => {
                                if (tokenResponse.error !== undefined) {
                                    console.error('Error fetching token:', tokenResponse.error);
                                    reject(tokenResponse);
                                }
                                this.accessToken = tokenResponse.access_token;
                                // Token usually lasts 1 hour (3599 seconds)
                                const expiresIn = parseInt(tokenResponse.expires_in, 10);
                                this.tokenExpiration = Date.now() + (expiresIn * 1000) - 60000; // Buffer 1 min

                                localStorage.setItem('gdrive_access_token', this.accessToken!);
                                localStorage.setItem('gdrive_token_expiry', this.tokenExpiration.toString());

                                resolve();
                            },
                        });
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkGoogle);
                reject(new Error('Google Identity Services script failed to load'));
            }, 10000);
        });
    }

    async signIn(): Promise<void> {
        if (!this.tokenClient) {
            throw new Error('Google Drive Service not initialized');
        }

        // If token is valid, we might not need to do anything, but requestAccessToken always triggers callback
        // If we want to force refresh or login:
        this.tokenClient.requestAccessToken({ prompt: '' });

        // We need to wait for the callback to verify. 
        // Since initTokenClient callback handles it, we can wrap this in a promise if needed, 
        // but the current design relies on the callback defined in init.
        // A better design might be to return a promise here.

        return new Promise((resolve) => {
            // Re-initialize with a one-time callback for this request?
            // Or just poll for token change?
            // For simplicity, let's assume the user clicks the button and we wait for the state to update or just optimistic.
            // Actually, let's refactor init to just set up the client, and signIn to trigger it.

            // Refactoring init above to be simpler.
            resolve();
        });
    }

    // Revised Init and SignIn for better flow
    async initAndSignIn(clientId: string): Promise<string> {
        // Wait for Google script to be ready if it's not yet
        await new Promise<void>((resolve, reject) => {
            const maxAttempts = 50;
            let attempts = 0;
            const check = setInterval(() => {
                attempts++;
                if (window.google && window.google.accounts) {
                    clearInterval(check);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(check);
                    reject(new Error('Google Identity Services script not loaded. Please check your internet connection and refresh.'));
                }
            }, 100);
        });

        return new Promise((resolve, reject) => {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        reject(new Error(tokenResponse.error_description || tokenResponse.error));
                        return;
                    }
                    this.accessToken = tokenResponse.access_token;
                    const expiresIn = parseInt(tokenResponse.expires_in, 10);
                    this.tokenExpiration = Date.now() + (expiresIn * 1000) - 60000;

                    localStorage.setItem('gdrive_access_token', this.accessToken!);
                    localStorage.setItem('gdrive_token_expiry', this.tokenExpiration.toString());
                    resolve(this.accessToken!);
                },
            });
            // Calling without arguments or with prompt: 'select_account' ensures popup appears if needed
            client.requestAccessToken();
        });
    }

    getFolderId(): string {
        return localStorage.getItem('gdrive_folder_id') || FOLDER_ID;
    }

    async uploadData(filename: string, data: any, mimeType: string = 'application/json'): Promise<any> {
        if (!this.isTokenValid()) {
            throw new Error('No valid access token. Please sign in to Google Drive.');
        }

        let fileContent: any;
        if (mimeType === 'application/json') {
            fileContent = JSON.stringify(data, null, 2);
        } else {
            fileContent = data;
        }

        const file = new Blob([fileContent], { type: mimeType });
        const metadata = {
            name: filename,
            mimeType: mimeType,
            parents: [this.getFolderId()],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
            },
            body: form,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        return await response.json();
    }

    async signInWithFirebase(): Promise<string> {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope(SCOPES);

            const result = await signInWithPopup(firebaseAuth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);

            if (!credential || !credential.accessToken) {
                throw new Error('Failed to get Google Access Token from login.');
            }

            this.accessToken = credential.accessToken;
            // Firebase doesn't directly give expiry in this call, but we can assume ~1 hour
            this.tokenExpiration = Date.now() + (3600 * 1000) - 60000;

            localStorage.setItem('gdrive_access_token', this.accessToken!);
            localStorage.setItem('gdrive_token_expiry', this.tokenExpiration.toString());

            return this.accessToken!;
        } catch (error: any) {
            console.error('Firebase Google Login Error:', error);
            throw new Error('Google Login failed: ' + (error.message || 'Check your browser pop-up blocker.'));
        }
    }

    async ensureAuthorized(): Promise<void> {
        if (this.isTokenValid()) return;

        const storedClientId = this.getClientId();
        console.log('storedClientId', storedClientId);

        if (storedClientId) {
            await this.initAndSignIn(storedClientId);
        } else {
            // Fallback to Firebase Google Login if no Client ID is provided
            await this.signInWithFirebase();
        }
    }

    async createBackup(): Promise<any> {
        // Lazy load XLSX
        const XLSX = await import('xlsx');

        const visitors = await visitorService.getAllVisitors();
        const auditLogs = await visitorService.getAllAuditLogs();

        // Transform visitors data
        const visitorSheetData = visitors.map(v => ({
            'Full Name': v.fullName || '',
            'Phone Number': v.phoneNumber || '',
            'Visiting Resident': v.residentName || '',
            'Room': v.roomNumber || '',
            'Check-in Time': v.checkInTime ? v.checkInTime.toLocaleString() : '',
            'Check-out Time': v.checkOutTime ? v.checkOutTime.toLocaleString() : '',
            'Status': v.status || '',
            'Visitor ID': v.visitorIdNumber || '',
            'Purpose': v.visitPurpose || '',
            'Badge Number': v.badgeNumber || ''
        }));

        // Transform audit log data
        const auditSheetData = auditLogs.map(log => ({
            'Timestamp': log.timestamp ? log.timestamp.toLocaleString() : '',
            'Action': log.action || '',
            'User ID': log.userId || '',
            'Visitor ID': log.visitorId || '',
            'Details': typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || ''
        }));

        const workbook = XLSX.utils.book_new();

        // Add Visitors sheet
        const visitorWorksheet = XLSX.utils.json_to_sheet(visitorSheetData);
        XLSX.utils.book_append_sheet(workbook, visitorWorksheet, 'Visitors');

        // Add Audit Logs sheet
        const auditWorksheet = XLSX.utils.json_to_sheet(auditSheetData);
        XLSX.utils.book_append_sheet(workbook, auditWorksheet, 'Audit Logs');

        // Generate binary data
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `project_nayana_backup_${dateStr}.xlsx`;

        return this.uploadData(filename, excelBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
}

export const googleDriveService = new GoogleDriveService();

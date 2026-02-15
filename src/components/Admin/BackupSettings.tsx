import React, { useState, useEffect } from 'react';
import { Cloud, Upload, Check, AlertTriangle, Clock } from 'lucide-react';
import { googleDriveService } from '../../services/googleDriveService';

export const BackupSettings: React.FC = () => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clientId, setClientId] = useState(localStorage.getItem('gdrive_client_id') || '');
    const [folderId, setFolderId] = useState(localStorage.getItem('gdrive_folder_id') || '');

    useEffect(() => {
        const token = localStorage.getItem('gdrive_access_token');
        if (token) {
            setIsAuthorized(true);
        }
        const last = localStorage.getItem('last_backup_date');
        if (last) {
            setLastBackup(last);
        }
    }, []);

    const handleAuthorize = async () => {
        try {
            if (!clientId) {
                setError('Please enter a valid Google Client ID');
                return;
            }

            await googleDriveService.initAndSignIn(clientId);
            localStorage.setItem('gdrive_client_id', clientId);
            localStorage.setItem('gdrive_folder_id', folderId);
            setIsAuthorized(true);
            setError(null);
        } catch (err: any) {
            setError('Authorization failed: ' + (err.message || 'Unknown error'));
        }
    };

    const handleBackup = async () => {
        try {
            setIsBackingUp(true);
            setError(null);
            await googleDriveService.createBackup();
            const now = new Date().toLocaleString();
            setLastBackup(now);
            localStorage.setItem('last_backup_date', now);
        } catch (err: any) {
            setError('Backup failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
                <Cloud className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Data Backup</h2>
            </div>

            <p className="text-sm text-gray-500 mb-6">
                Configure automated backups to Google Drive. The system will automatically backup visitor data at the beginning of every hour if this device is active.
            </p>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}

            <div className="space-y-4">
                {!isAuthorized ? (
                    <div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Client ID</label>
                            <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Enter your OAuth 2.0 Client ID"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                You need a Google Cloud Project with the Drive API enabled.
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Backup Folder ID (Optional)</label>
                            <input
                                type="text"
                                value={folderId}
                                onChange={(e) => setFolderId(e.target.value)}
                                placeholder="Enter Google Drive Folder ID"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Leave empty to use the default system backup folder.
                            </p>
                        </div>
                        <button
                            onClick={handleAuthorize}
                            disabled={!clientId}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            Connect Google Drive
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50 p-4 rounded-md">
                        <div className="flex items-center mb-4 sm:mb-0">
                            <div className="bg-green-100 p-2 rounded-full mr-3">
                                <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Google Drive Connected</p>
                                <p className="text-xs text-gray-500">Backups will be saved to specified folder</p>
                                <button
                                    onClick={() => {
                                        setIsAuthorized(false);
                                        localStorage.removeItem('gdrive_access_token');
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                                >
                                    Disconnect / Change Settings
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                        >
                            {isBackingUp ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Backup Now
                                </>
                            )}
                        </button>
                    </div>
                )}

                {lastBackup && (
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                        <Clock className="w-4 h-4 mr-1" />
                        Last backup: {lastBackup}
                    </div>
                )}
            </div>
        </div>
    );
};

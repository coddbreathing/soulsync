/**
 * Google Drive API Integration Helpers for SoulSync
 * Handles full-stack, secure creation of folders, uploading video recording blobs,
 * backing up and restoring application caches directly in the user's personal Google Drive.
 */

// Interface for File details returned by Google Drive
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
  webViewLink?: string;
}

/**
 * Ensures a specific folder exists in Google Drive.
 * If not, creates it and returns its ID.
 */
export async function getOrCreateFolder(accessToken: string, folderName: string = "SoulSync App Vault"): Promise<string> {
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`;

  try {
    const searchResp = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchResp.ok) {
      throw new Error(`Google Drive Search failed: ${searchResp.statusText}`);
    }

    const searchData = await searchResp.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Folder does not exist, let's create it
    const createResp = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!createResp.ok) {
      throw new Error(`Failed to create Folder on Google Drive: ${createResp.statusText}`);
    }

    const createdFolder = await createResp.json();
    return createdFolder.id;
  } catch (error) {
    console.error("getOrCreateFolder error:", error);
    throw error;
  }
}

/**
 * Uploads a file (video or JSON cache) to Google Drive's "SoulSync App Vault" folder.
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<DriveFile> {
  try {
    const activeFolderId = folderId || (await getOrCreateFolder(accessToken));

    // Construct a standard multipart Google Drive upload body
    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: [activeFolderId],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", fileBlob);

    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,size";
    const resp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!resp.ok) {
      throw new Error(`Failed to upload to Google Drive: ${resp.statusText}`);
    }

    return await resp.json();
  } catch (error) {
    console.error("uploadFileToDrive error:", error);
    throw error;
  }
}

/**
 * Search and retrieve list of files in the SoulSync folder.
 */
export async function listFilesFromFolder(accessToken: string): Promise<DriveFile[]> {
  try {
    const folderId = await getOrCreateFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,mimeType,webViewLink,createdTime,size)`;

    const resp = await fetch(listUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to list files: ${resp.statusText}`);
    }

    const data = await resp.json();
    return data.files || [];
  } catch (error) {
    console.error("listFilesFromFolder error:", error);
    return [];
  }
}

/**
 * Fetch and download specific file content by ID (e.g., retrieving app cache)
 */
export async function downloadFileBytes(accessToken: string, fileId: string): Promise<any> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  try {
    const resp = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to download file from Google Drive: ${resp.statusText}`);
    }

    return await resp.json();
  } catch (error) {
    console.error("downloadFileBytes error:", error);
    throw error;
  }
}

/**
 * Find the latest app cache json file in Google Drive.
 */
export async function findLatestCacheFile(accessToken: string): Promise<string | null> {
  try {
    const folderId = await getOrCreateFolder(accessToken);
    const query = encodeURIComponent(
      `'${folderId}' in parents and name = 'soulsync_app_cache.json' and trashed = false`
    );
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name)`;

    const resp = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Search cache failed: ${resp.statusText}`);
    }

    const data = await resp.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id; // latest cache file ID
    }
    return null;
  } catch (error) {
    console.error("findLatestCacheFile error:", error);
    return null;
  }
}

/**
 * Permanently delete a file from Google Drive.
 */
export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return resp.ok;
  } catch (error) {
    console.error("deleteFileFromDrive error:", error);
    return false;
  }
}

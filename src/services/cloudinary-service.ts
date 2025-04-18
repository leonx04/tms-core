import { database } from "@/config/firebase";
import { get, push, ref, remove, set, update } from "firebase/database";

// Type for Cloudinary project configuration
export type ProjectCloudinaryConfig = {
  id: string;
  projectId: string;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  webhookEnabled: boolean;
  webhookUrl?: string;
};

// Create a new Cloudinary configuration for a project
export const createCloudinaryConfig = async (
  projectId: string,
  userId: string,
  config: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folderName?: string;
  }
): Promise<string> => {
  try {
    // Check if a configuration already exists for this project
    const existingConfig = await getCloudinaryConfigByProjectId(projectId);

    if (existingConfig) {
      // Update existing configuration
      await updateCloudinaryConfig(existingConfig.id, userId, {
        cloudName: config.cloudName,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        folderName: config.folderName || existingConfig.folderName,
      });
      return existingConfig.id;
    }

    // Create a new configuration
    const configRef = push(ref(database, "projectCloudinary"));
    const configId = configRef.key as string;

    const timestamp = new Date().toISOString();

    const newConfig: ProjectCloudinaryConfig = {
      id: configId,
      projectId,
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      folderName: config.folderName || `project_${projectId}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
      updatedBy: userId,
      webhookEnabled: false,
    };

    await set(configRef, newConfig);
    return configId;
  } catch (error) {
    console.error("Error creating Cloudinary config:", error);
    throw error;
  }
};

// Get Cloudinary configuration by ID
export const getCloudinaryConfig = async (
  configId: string
): Promise<ProjectCloudinaryConfig | null> => {
  try {
    const configRef = ref(database, `projectCloudinary/${configId}`);
    const snapshot = await get(configRef);

    if (snapshot.exists()) {
      return snapshot.val() as ProjectCloudinaryConfig;
    }

    return null;
  } catch (error) {
    console.error("Error getting Cloudinary config:", error);
    throw error;
  }
};

// Get Cloudinary configuration by project ID
export const getCloudinaryConfigByProjectId = async (
  projectId: string
): Promise<ProjectCloudinaryConfig | null> => {
  try {
    const configsRef = ref(database, "projectCloudinary");
    const snapshot = await get(configsRef);

    if (snapshot.exists()) {
      const configs = snapshot.val();

      for (const configId in configs) {
        if (configs[configId].projectId === projectId) {
          return { ...configs[configId], id: configId };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting Cloudinary config by project ID:", error);
    throw error;
  }
};

// Update Cloudinary configuration
export const updateCloudinaryConfig = async (
  configId: string,
  userId: string,
  updates: Partial<{
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folderName: string;
    webhookEnabled: boolean;
    webhookUrl: string;
  }>
): Promise<boolean> => {
  try {
    const configRef = ref(database, `projectCloudinary/${configId}`);
    const snapshot = await get(configRef);

    if (!snapshot.exists()) {
      return false;
    }

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await update(configRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating Cloudinary config:", error);
    throw error;
  }
};

// Delete Cloudinary configuration
export const deleteCloudinaryConfig = async (
  configId: string
): Promise<boolean> => {
  try {
    const configRef = ref(database, `projectCloudinary/${configId}`);
    const snapshot = await get(configRef);

    if (!snapshot.exists()) {
      return false;
    }

    await remove(configRef);
    return true;
  } catch (error) {
    console.error("Error deleting Cloudinary config:", error);
    throw error;
  }
};

// Store Cloudinary upload result in the database
export const storeCloudinaryUpload = async (
  projectId: string,
  userId: string,
  uploadResult: {
    publicId: string;
    url: string;
    resourceType: string;
    format: string;
    width?: number;
    height?: number;
    duration?: number;
    bytes?: number;
    taskId?: string;
    commentId?: string;
  }
): Promise<string> => {
  try {
    // Remove undefined values from the uploadResult object
    const sanitizedUploadResult = Object.fromEntries(
      Object.entries(uploadResult).filter(([_, value]) => value !== undefined)
    );

    const uploadId = push(
      ref(database, `projectCloudinaryUploads/${projectId}`)
    ).key;
    if (!uploadId) {
      throw new Error("Failed to generate upload ID");
    }

    await set(
      ref(database, `projectCloudinaryUploads/${projectId}/${uploadId}`),
      {
        ...sanitizedUploadResult,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      }
    );

    return uploadId;
  } catch (error) {
    console.error("Error storing Cloudinary upload:", error);
    throw error;
  }
};
// Get all Cloudinary uploads for a project
export const getProjectCloudinaryUploads = async (
  projectId: string
): Promise<any[]> => {
  try {
    const uploadsRef = ref(database, `projectCloudinaryUploads/${projectId}`);
    const snapshot = await get(uploadsRef);

    if (snapshot.exists()) {
      const uploads = snapshot.val();
      return Object.keys(uploads).map((key) => ({
        id: key,
        ...uploads[key],
      }));
    }

    return [];
  } catch (error) {
    console.error("Error getting project Cloudinary uploads:", error);
    throw error;
  }
};

// Get Cloudinary uploads for a specific task
export const getTaskCloudinaryUploads = async (
  projectId: string,
  taskId: string
): Promise<any[]> => {
  try {
    const uploadsRef = ref(database, `projectCloudinaryUploads/${projectId}`);
    const snapshot = await get(uploadsRef);

    if (snapshot.exists()) {
      const uploads = snapshot.val();
      return Object.keys(uploads)
        .filter((key) => uploads[key].taskId === taskId)
        .map((key) => ({
          id: key,
          ...uploads[key],
        }));
    }

    return [];
  } catch (error) {
    console.error("Error getting task Cloudinary uploads:", error);
    throw error;
  }
};

// Get Cloudinary uploads for a specific comment
export const getCommentCloudinaryUploads = async (
  projectId: string,
  commentId: string
): Promise<any[]> => {
  try {
    const uploadsRef = ref(database, `projectCloudinaryUploads/${projectId}`);
    const snapshot = await get(uploadsRef);

    if (snapshot.exists()) {
      const uploads = snapshot.val();
      return Object.keys(uploads)
        .filter((key) => uploads[key].commentId === commentId)
        .map((key) => ({
          id: key,
          ...uploads[key],
        }));
    }

    return [];
  } catch (error) {
    console.error("Error getting comment Cloudinary uploads:", error);
    throw error;
  }
};

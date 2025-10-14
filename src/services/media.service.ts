import { API_ROOT } from "./http";

// Interfaces para archivos multimedia
export interface MediaFileDTO {
  id: string;
  type: 'image' | 'video' | 'audio' | 'text';
  url: string;
  name: string;
  description?: string;
  duration?: number; // en segundos
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaConfigDTO {
  autoRefreshInterval: number;
  mediaRotationInterval: number;
  showClock: boolean;
  showWeather: boolean;
  enableSound: boolean;
  backgroundMusic: boolean;
  textScrollSpeed: number;
  maxConcurrentMedia: number;
}

export interface MediaUploadDTO {
  file: File;
  type: 'image' | 'video' | 'audio' | 'text';
  name: string;
  description?: string;
  duration?: number;
  order: number;
}

const API = `${API_ROOT}/pantalla/media`;

// Función helper para requests
async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const r = await fetch(input, init);
  const ct = r.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const data = isJSON ? await r.json().catch(() => null) : await r.text().catch(() => null);

  if (!r.ok) {
    const e: any = new Error(`HTTP ${r.status} ${r.statusText}`);
    e.status = r.status;
    e.detail = data;
    throw e;
  }
  return data as T;
}

export const MediaAPI = {
  // Obtener archivos multimedia activos
  async getActiveFiles(): Promise<MediaFileDTO[]> {
    try {
      const files = await fetchJSON<MediaFileDTO[]>(`${API}/active`, {
        headers: { Accept: "application/json" },
      });
      console.log("Archivos multimedia obtenidos:", files);
      return Array.isArray(files) ? files : [];
    } catch (error) {
      console.error("Error obteniendo archivos multimedia:", error);
      // Retornar datos mock en caso de error
      return this.getMockFiles();
    }
  },

  // Obtener todos los archivos multimedia
  async getAllFiles(): Promise<MediaFileDTO[]> {
    try {
      const files = await fetchJSON<MediaFileDTO[]>(API, {
        headers: { Accept: "application/json" },
      });
      return Array.isArray(files) ? files : [];
    } catch (error) {
      console.error("Error obteniendo todos los archivos:", error);
      return this.getMockFiles();
    }
  },

  // Subir nuevo archivo multimedia
  async uploadFile(uploadData: MediaUploadDTO): Promise<MediaFileDTO> {
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('type', uploadData.type);
      formData.append('name', uploadData.name);
      formData.append('order', uploadData.order.toString());
      
      if (uploadData.description) {
        formData.append('description', uploadData.description);
      }
      if (uploadData.duration) {
        formData.append('duration', uploadData.duration.toString());
      }

      const file = await fetchJSON<MediaFileDTO>(`${API}/upload`, {
        method: "POST",
        body: formData,
      });
      
      console.log("Archivo subido exitosamente:", file);
      return file;
    } catch (error) {
      console.error("Error subiendo archivo:", error);
      throw error;
    }
  },

  // Actualizar archivo multimedia
  async updateFile(id: string, updates: Partial<MediaFileDTO>): Promise<MediaFileDTO> {
    try {
      const file = await fetchJSON<MediaFileDTO>(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      console.log("Archivo actualizado:", file);
      return file;
    } catch (error) {
      console.error("Error actualizando archivo:", error);
      throw error;
    }
  },

  // Eliminar archivo multimedia
  async deleteFile(id: string): Promise<void> {
    try {
      await fetchJSON<void>(`${API}/${id}`, {
        method: "DELETE",
      });
      
      console.log("Archivo eliminado:", id);
    } catch (error) {
      console.error("Error eliminando archivo:", error);
      throw error;
    }
  },

  // Activar/desactivar archivo
  async toggleFileStatus(id: string, isActive: boolean): Promise<MediaFileDTO> {
    try {
      const file = await fetchJSON<MediaFileDTO>(`${API}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      
      console.log("Estado del archivo actualizado:", file);
      return file;
    } catch (error) {
      console.error("Error actualizando estado del archivo:", error);
      throw error;
    }
  },

  // Reordenar archivos
  async reorderFiles(fileOrders: { id: string; order: number }[]): Promise<MediaFileDTO[]> {
    try {
      const files = await fetchJSON<MediaFileDTO[]>(`${API}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileOrders }),
      });
      
      console.log("Archivos reordenados:", files);
      return files;
    } catch (error) {
      console.error("Error reordenando archivos:", error);
      throw error;
    }
  },

  // Obtener configuración de la pantalla
  async getConfig(): Promise<MediaConfigDTO> {
    try {
      const config = await fetchJSON<MediaConfigDTO>(`${API}/config`, {
        headers: { Accept: "application/json" },
      });
      
      return config;
    } catch (error) {
      console.error("Error obteniendo configuración:", error);
      // Retornar configuración por defecto
      return {
        autoRefreshInterval: 10000,
        mediaRotationInterval: 15000,
        showClock: true,
        showWeather: false,
        enableSound: true,
        backgroundMusic: false,
        textScrollSpeed: 30,
        maxConcurrentMedia: 4
      };
    }
  },

  // Actualizar configuración
  async updateConfig(config: Partial<MediaConfigDTO>): Promise<MediaConfigDTO> {
    try {
      const updatedConfig = await fetchJSON<MediaConfigDTO>(`${API}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      
      console.log("Configuración actualizada:", updatedConfig);
      return updatedConfig;
    } catch (error) {
      console.error("Error actualizando configuración:", error);
      throw error;
    }
  },

  // Datos mock para desarrollo
  getMockFiles(): MediaFileDTO[] {
    return [
      {
        id: '1',
        type: 'image',
        url: 'https://picsum.photos/800/600?random=1',
        name: 'Banner Servicios Municipales',
        description: 'Información sobre servicios disponibles',
        duration: 10,
        order: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        name: 'Video Promocional Alcaldía',
        description: 'Video promocional de servicios municipales',
        duration: 30,
        order: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        type: 'text',
        url: '',
        name: 'Anuncio de Horarios',
        description: 'Información sobre horarios de atención',
        duration: 8,
        order: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        type: 'image',
        url: 'https://picsum.photos/800/600?random=2',
        name: 'Campañas Ciudadanas',
        description: 'Información sobre campañas activas',
        duration: 12,
        order: 4,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '5',
        type: 'image',
        url: 'https://picsum.photos/800/600?random=3',
        name: 'Eventos Municipales',
        description: 'Próximos eventos y actividades',
        duration: 8,
        order: 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
};
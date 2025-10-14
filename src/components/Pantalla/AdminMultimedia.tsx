import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image,
  Video,
  FileText,
  Music,
  Play,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Plus
} from 'lucide-react';
import { MediaAPI, type MediaFileDTO, type MediaConfigDTO, type MediaUploadDTO } from '../../services/media.service';
import './AdminMultimedia.css';

const AdminMultimedia: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFileDTO[]>([]);
  const [config, setConfig] = useState<MediaConfigDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para upload
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    type: 'image' as 'image' | 'video' | 'audio' | 'text',
    name: '',
    description: '',
    duration: 10,
    order: 1
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadMediaFiles();
    loadConfig();
  }, []);

  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      const files = await MediaAPI.getAllFiles();
      setMediaFiles(files.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error cargando archivos:', error);
      setError('Error al cargar los archivos multimedia');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const configData = await MediaAPI.getConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        name: file.name.split('.')[0]
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    try {
      setLoading(true);
      const uploadData: MediaUploadDTO = {
        file: uploadForm.file,
        type: uploadForm.type,
        name: uploadForm.name,
        description: uploadForm.description,
        duration: uploadForm.duration,
        order: Math.max(...mediaFiles.map(f => f.order), 0) + 1
      };

      await MediaAPI.uploadFile(uploadData);
      await loadMediaFiles();
      setShowUploadModal(false);
      setUploadForm({
        file: null,
        type: 'image',
        name: '',
        description: '',
        duration: 10,
        order: 1
      });
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      setError('Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await MediaAPI.toggleFileStatus(id, isActive);
      await loadMediaFiles();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError('Error al cambiar el estado del archivo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este archivo?')) return;

    try {
      await MediaAPI.deleteFile(id);
      await loadMediaFiles();
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      setError('Error al eliminar el archivo');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = mediaFiles.findIndex(f => f.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= mediaFiles.length) return;

    const newOrder = [...mediaFiles];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    
    const fileOrders = newOrder.map((file, index) => ({
      id: file.id,
      order: index + 1
    }));

    try {
      await MediaAPI.reorderFiles(fileOrders);
      await loadMediaFiles();
    } catch (error) {
      console.error('Error reordenando archivos:', error);
      setError('Error al reordenar los archivos');
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;

    try {
      await MediaAPI.updateConfig(config);
      setShowConfigModal(false);
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      setError('Error al actualizar la configuración');
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image size={20} />;
      case 'video': return <Video size={20} />;
      case 'audio': return <Music size={20} />;
      case 'text': return <FileText size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="admin-multimedia">
      <div className="admin-header">
        <h1>Administración de Multimedia</h1>
        <div className="header-actions">
          <button
            onClick={() => setShowConfigModal(true)}
            className="btn-secondary"
          >
            <Settings size={18} />
            Configuración
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary"
          >
            <Plus size={18} />
            Agregar Archivo
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">
            <X size={16} />
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      )}

      <div className="media-grid">
        {mediaFiles.map((file, index) => (
          <div key={file.id} className={`media-card ${!file.isActive ? 'inactive' : ''}`}>
            <div className="media-preview">
              {file.type === 'image' && (
                <img src={file.url} alt={file.name} />
              )}
              {file.type === 'video' && (
                <video src={file.url} muted>
                  <track kind="captions" />
                </video>
              )}
              {file.type === 'text' && (
                <div className="text-preview">
                  <FileText size={48} />
                  <p>Contenido de texto</p>
                </div>
              )}
              {file.type === 'audio' && (
                <div className="audio-preview">
                  <Music size={48} />
                  <p>Archivo de audio</p>
                </div>
              )}
              
              <div className="media-overlay">
                <button
                  onClick={() => console.log('Preview:', file)}
                  className="overlay-btn"
                >
                  <Play size={16} />
                </button>
              </div>
            </div>

            <div className="media-info">
              <div className="media-header">
                <div className="file-type">
                  {getFileTypeIcon(file.type)}
                </div>
                <div className="media-meta">
                  <h3>{file.name}</h3>
                  <p className="description">{file.description}</p>
                  <div className="duration">
                    Duración: {formatDuration(file.duration || 0)}
                  </div>
                </div>
              </div>

              <div className="media-actions">
                <div className="order-controls">
                  <button
                    onClick={() => handleReorder(file.id, 'up')}
                    disabled={index === 0}
                    className="order-btn"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <span className="order-number">{file.order}</span>
                  <button
                    onClick={() => handleReorder(file.id, 'down')}
                    disabled={index === mediaFiles.length - 1}
                    className="order-btn"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="action-buttons">
                  <button
                    onClick={() => handleToggleStatus(file.id, !file.isActive)}
                    className={`action-btn ${file.isActive ? 'active' : 'inactive'}`}
                  >
                    {file.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  
                  <button
                    onClick={() => console.log('Edit:', file)}
                    className="action-btn edit"
                  >
                    <Edit size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="action-btn delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mediaFiles.length === 0 && !loading && (
        <div className="empty-state">
          <Upload size={64} />
          <h3>No hay archivos multimedia</h3>
          <p>Comience agregando imágenes, videos o anuncios de texto</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary"
          >
            Agregar primer archivo
          </button>
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Agregar Archivo Multimedia</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="upload-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-zone"
                >
                  <Upload size={48} />
                  <p>Haga clic para seleccionar un archivo</p>
                  <span>Imágenes, videos o audio</span>
                </div>

                {uploadForm.file && (
                  <div className="file-selected">
                    <p>Archivo seleccionado: {uploadForm.file.name}</p>
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="form-group">
                  <label>Tipo de contenido</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm(prev => ({ 
                      ...prev, 
                      type: e.target.value as any 
                    }))}
                  >
                    <option value="image">Imagen</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="text">Texto/Anuncio</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))}
                    placeholder="Nombre del archivo"
                  />
                </div>

                <div className="form-group">
                  <label>Descripción (opcional)</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))}
                    placeholder="Descripción del contenido"
                  />
                </div>

                <div className="form-group">
                  <label>Duración (segundos)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={uploadForm.duration}
                    onChange={(e) => setUploadForm(prev => ({ 
                      ...prev, 
                      duration: parseInt(e.target.value) || 10 
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.file || !uploadForm.name}
                className="btn-primary"
              >
                <Save size={16} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración */}
      {showConfigModal && config && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Configuración de Pantalla</h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="config-section">
                <h3>Intervalos de Tiempo</h3>
                
                <div className="form-group">
                  <label>Intervalo de actualización (ms)</label>
                  <input
                    type="number"
                    min="5000"
                    max="60000"
                    step="1000"
                    value={config.autoRefreshInterval}
                    onChange={(e) => setConfig(prev => prev ? {
                      ...prev,
                      autoRefreshInterval: parseInt(e.target.value)
                    } : null)}
                  />
                </div>

                <div className="form-group">
                  <label>Rotación de multimedia (ms)</label>
                  <input
                    type="number"
                    min="5000"
                    max="120000"
                    step="1000"
                    value={config.mediaRotationInterval}
                    onChange={(e) => setConfig(prev => prev ? {
                      ...prev,
                      mediaRotationInterval: parseInt(e.target.value)
                    } : null)}
                  />
                </div>

                <div className="form-group">
                  <label>Velocidad de texto (px/s)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={config.textScrollSpeed}
                    onChange={(e) => setConfig(prev => prev ? {
                      ...prev,
                      textScrollSpeed: parseInt(e.target.value)
                    } : null)}
                  />
                </div>
              </div>

              <div className="config-section">
                <h3>Opciones de Visualización</h3>
                
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={config.showClock}
                      onChange={(e) => setConfig(prev => prev ? {
                        ...prev,
                        showClock: e.target.checked
                      } : null)}
                    />
                    Mostrar reloj
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={config.enableSound}
                      onChange={(e) => setConfig(prev => prev ? {
                        ...prev,
                        enableSound: e.target.checked
                      } : null)}
                    />
                    Habilitar sonido
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={config.backgroundMusic}
                      onChange={(e) => setConfig(prev => prev ? {
                        ...prev,
                        backgroundMusic: e.target.checked
                      } : null)}
                    />
                    Música de fondo
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowConfigModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateConfig}
                className="btn-primary"
              >
                <Save size={16} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMultimedia;
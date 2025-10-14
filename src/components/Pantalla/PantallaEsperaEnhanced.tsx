import { useEffect, useState, useRef } from 'react';
import { Monitor, Clock, Wifi, WifiOff, Calendar, Play, Pause, SkipForward, SkipBack, Image, RefreshCw } from 'lucide-react';
import { PantallaFeedAPI } from '../../services/pantalla-feed.service';
import { MediaAPI } from '../../services/media.service';
import type { TicketLlamadoDto } from '../../services/pantalla-feed.service';
import type { MediaFileDTO, MediaConfigDTO } from '../../services/media.service';
import './PantallaEspera.enhanced.css';

export default function PantallaEsperaEnhanced() {
  const [llamados, setLlamados] = useState<TicketLlamadoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estados para multimedia
  const [mediaFiles, setMediaFiles] = useState<MediaFileDTO[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mediaConfig, setMediaConfig] = useState<MediaConfigDTO | null>(null);
  const mediaIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Estados para sintesis de voz
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastAnnouncedRef = useRef<Set<string>>(new Set());

  /**
   * Anuncia un turno usando sintesis de voz
   */
  const anunciarTurno = (llamado: TicketLlamadoDto) => {
    console.log('[PantallaEnhanced] Intentando anunciar turno:', llamado);

    if (!voiceEnabled) {
      console.log('[PantallaEnhanced] Voz deshabilitada');
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.error('[PantallaEnhanced] SpeechSynthesis no disponible');
      return;
    }

    const key = `${llamado.ticket}-${llamado.ventanilla}`;
    
    if (lastAnnouncedRef.current.has(key)) {
      console.log('[PantallaEnhanced] Turno ya anunciado:', key);
      return;
    }
    
    lastAnnouncedRef.current.add(key);
    console.log('[PantallaEnhanced] Marcado como anunciado:', key);

    // Limpiar cache antiguo (mantener ultimos 10)
    if (lastAnnouncedRef.current.size > 10) {
      const valores = Array.from(lastAnnouncedRef.current);
      lastAnnouncedRef.current = new Set(valores.slice(-10));
    }

    const mensaje = `Turno ${llamado.ticket}, ventanilla ${llamado.ventanilla}`;
    console.log('[PantallaEnhanced] Mensaje:', mensaje);

    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(mensaje);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
        console.log('[PantallaEnhanced] Voz seleccionada:', spanishVoice.name);
      }

      utterance.onstart = () => console.log('[PantallaEnhanced] Reproduccion iniciada');
      utterance.onend = () => console.log('[PantallaEnhanced] Reproduccion finalizada');
      utterance.onerror = (e) => console.error('[PantallaEnhanced] Error:', e);

      console.log('[PantallaEnhanced] Llamando speak()');
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PantallaFeedAPI.ultimosLlamados();
      
      console.log('[PantallaEnhanced] Carga de datos - Nuevos:', data.length, 'Previos:', llamados.length);
      
      // Detectar turnos nuevos que no estaban antes
      const nuevosLlamados = data.filter(nuevoLlamado => {
        const existeAntes = llamados.some(
          existente => existente.ticket === nuevoLlamado.ticket && 
                       existente.ventanilla === nuevoLlamado.ventanilla
        );
        
        if (!existeAntes) {
          console.log('[PantallaEnhanced] NUEVO TURNO:', nuevoLlamado.ticket, 'Vent:', nuevoLlamado.ventanilla);
        }
        
        return !existeAntes;
      });

      console.log('[PantallaEnhanced] Total NUEVOS:', nuevosLlamados.length);

      // Anunciar cada turno nuevo con delay entre ellos
      if (nuevosLlamados.length > 0) {
        console.log('[PantallaEnhanced] ANUNCIANDO', nuevosLlamados.length, 'turno(s)');
        nuevosLlamados.forEach((llamado, index) => {
          setTimeout(() => {
            console.log('[PantallaEnhanced] Anunciando:', llamado.ticket);
            anunciarTurno(llamado);
          }, index * 3000); // 3 segundos entre cada anuncio
        });
      }
      
      setLlamados(data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarMediaArchivos = async () => {
    try {
      const [files, config] = await Promise.all([
        MediaAPI.getActiveFiles(),
        MediaAPI.getConfig()
      ]);
      setMediaFiles(files);
      setMediaConfig(config);
    } catch (error) {
      console.error('Error cargando archivos multimedia:', error);
    }
  };

  const nextMedia = () => {
    if (mediaFiles.length > 0) {
      setCurrentMediaIndex((prev) => (prev + 1) % mediaFiles.length);
    }
  };

  const prevMedia = () => {
    if (mediaFiles.length > 0) {
      setCurrentMediaIndex((prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const currentMedia = mediaFiles[currentMediaIndex];
  const displayInterval = mediaConfig?.mediaRotationInterval || 15000;

  // Efecto para inicializar las voces
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[PantallaEnhanced] Voces cargadas:', voices.length);
        voices.forEach((voice, index) => {
          console.log(`[PantallaEnhanced] Voz ${index}: ${voice.name} (${voice.lang})`);
        });
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Efecto para escuchar notificaciones de re-llamado via localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'turno-notification' && e.newValue) {
        try {
          const notificacion = JSON.parse(e.newValue);
          console.log('[PantallaEnhanced] Notificacion recibida:', notificacion);
          
          if (notificacion.accion === 'rellamar') {
            const { idTicket } = notificacion;
            
            const turnoRellamado = llamados.find(t => 
              String(t.ticket).toLowerCase().includes(String(idTicket).toLowerCase()) ||
              t.ticket === String(idTicket)
            );
            
            if (turnoRellamado) {
              const key = `${turnoRellamado.ticket}-${turnoRellamado.ventanilla}`;
              lastAnnouncedRef.current.delete(key);
              
              console.log('[PantallaEnhanced] Re-anunciando turno:', turnoRellamado.ticket);
              anunciarTurno(turnoRellamado);
            } else {
              console.log('[PantallaEnhanced] Turno no encontrado, actualizando...');
              cargarDatos();
            }
          }
        } catch (error) {
          console.error('[PantallaEnhanced] Error procesando notificacion:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [llamados]);

  useEffect(() => {
    // Cargar datos iniciales
    cargarDatos();
    cargarMediaArchivos();
    
    // Auto-refresh cada 5 segundos para mantener actualizado
    const interval = setInterval(cargarDatos, 5000);
    
    // Escuchar cambios de conectividad
    const handleOnline = () => {
      setIsOnline(true);
      cargarDatos();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Efecto para rotación automática de multimedia
  useEffect(() => {
    if (mediaFiles.length > 0 && isPlaying) {
      if (mediaIntervalRef.current) {
        clearInterval(mediaIntervalRef.current);
      }

      const intervalId = window.setInterval(() => {
        nextMedia();
      }, displayInterval);

      mediaIntervalRef.current = intervalId;

      return () => {
        if (mediaIntervalRef.current) {
          clearInterval(mediaIntervalRef.current);
        }
      };
    }
  }, [mediaFiles.length, currentMediaIndex, isPlaying, displayInterval]);

  // Manejar finalización de videos
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && currentMedia?.type === 'video') {
      const handleEnded = () => {
        nextMedia();
      };
      videoElement.addEventListener('ended', handleEnded);
      return () => videoElement.removeEventListener('ended', handleEnded);
    }
  }, [currentMedia]);

  const horaActual = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatHora = (fechaStr: string | null | undefined) => {
    if (!fechaStr) return '--:--';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="pantalla-container">
      {/* Header */}
      <div className="pantalla-header">
        <div className="header-content">
          <h1>ALCALDÍA MUNICIPAL</h1>
          <p className="header-subtitle">Sistema de Gestión de Turnos</p>
          
          <div className="status-bar">
            <div className={`status-item ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
              <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
            </div>
            
            <div className="status-item">
              <Calendar size={20} />
              <span>{fechaActual}</span>
            </div>
            
            <div className="status-item">
              <Clock size={20} />
              <span>{horaActual}</span>
            </div>

            <button 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="status-item"
              style={{ 
                cursor: 'pointer', 
                background: voiceEnabled ? 'var(--success-glass)' : 'var(--glass-bg)',
                color: voiceEnabled ? 'var(--success)' : 'var(--muted)'
              }}
              title={voiceEnabled ? 'Desactivar anuncios de voz' : 'Activar anuncios de voz'}
            >
              <span style={{ fontSize: '20px' }}>🔊</span>
              <span>{voiceEnabled ? 'Voz ON' : 'Voz OFF'}</span>
            </button>

            <button 
              onClick={() => {
                lastAnnouncedRef.current.clear();
                anunciarTurno({ 
                  ticket: 'TEST01', 
                  ventanilla: '1', 
                  servicio: 'Prueba', 
                  hora: '12:00' 
                });
              }}
              className="status-item"
              style={{ cursor: 'pointer', background: 'var(--info-glass)' }}
              title="Probar síntesis de voz"
            >
              <span style={{ fontSize: '20px' }}>🎤</span>
              <span>Probar</span>
            </button>

            <button 
              onClick={cargarDatos} 
              className="status-item"
              style={{ cursor: 'pointer', background: 'var(--glass-bg)' }}
              disabled={loading}
            >
              <RefreshCw size={20} className={loading ? 'spinning' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="pantalla-content">
        {/* Panel de turnos */}
        <div className="turnos-panel">
          <h2 className="panel-title">TURNOS LLAMADOS</h2>

          {loading && llamados.length === 0 ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando turnos...</p>
            </div>
          ) : error && llamados.length === 0 ? (
            <div className="error-container">
              <Monitor className="error-icon" />
              <h3>Error de conexión</h3>
              <p>{error}</p>
            </div>
          ) : llamados.length === 0 ? (
            <div className="empty-container">
              <Monitor size={60} style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
              <h3>No hay turnos llamados</h3>
              <p>Los turnos aparecerán aquí cuando sean llamados</p>
            </div>
          ) : (
            llamados.map((turno, index) => (
              <div 
                key={`${turno.ticket}-${index}`} 
                className="turno-card llamando"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="turno-header">
                  <div className="turno-codigo">{turno.ticket}</div>
                  <div className="turno-estado llamando">
                    LLAMANDO
                  </div>
                </div>

                <div className="turno-body">
                  <div className="turno-info">
                    <Monitor />
                    <span className="info-label">Servicio:</span>
                    <span className="info-value">{turno.servicio || 'Sin especificar'}</span>
                  </div>

                  <div className="turno-info">
                    <Clock />
                    <span className="info-label">Hora llamado:</span>
                    <span className="info-value">{formatHora(turno.hora)}</span>
                  </div>

                  <div className="ventanilla-badge">
                    🪟 VENTANILLA {turno.ventanilla}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel multimedia */}
        <div className="media-panel">
          <h2 className="panel-title">INFORMACIÓN</h2>
          
          <div className="media-container">
            {mediaFiles.length === 0 ? (
              <div className="media-placeholder">
                <Image />
                <p>No hay contenido multimedia</p>
              </div>
            ) : currentMedia?.type === 'image' ? (
              <img
                src={currentMedia.url}
                alt={currentMedia.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : currentMedia?.type === 'video' ? (
              <video
                ref={videoRef}
                src={currentMedia.url}
                autoPlay
                muted
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : null}
          </div>

          {mediaFiles.length > 0 && (
            <div className="media-controls">
              <button onClick={prevMedia} className="media-btn" title="Anterior">
                <SkipBack />
              </button>
              <button onClick={togglePlayPause} className="media-btn" title={isPlaying ? 'Pausar' : 'Reproducir'}>
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <button onClick={nextMedia} className="media-btn" title="Siguiente">
                <SkipForward />
              </button>
            </div>
          )}

          {mediaFiles.length > 0 && (
            <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
              {currentMediaIndex + 1} / {mediaFiles.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

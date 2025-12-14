import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Monitor, Users, Clock, AlertCircle, Wifi, Calendar, Play, Pause, SkipForward, SkipBack, Image } from 'lucide-react';
import { PantallaFeedAPI } from '../../services/pantalla-feed.service';
import { MediaAPI } from '../../services/media.service';
import type { TicketLlamadoDto } from '../../services/pantalla-feed.service';
import type { MediaFileDTO, MediaConfigDTO } from '../../services/media.service';

interface PantallaEsperaProps {
  disableVoice?: boolean;
}

export default function PantallaEspera({ disableVoice = false }: PantallaEsperaProps = {}) {
  const [llamados, setLlamados] = useState<TicketLlamadoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estados para multimedia
  const [mediaFiles, setMediaFiles] = useState<MediaFileDTO[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mediaConfig, setMediaConfig] = useState<MediaConfigDTO | null>(null);
  const mediaIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Estados para síntesis de voz
  const [voiceEnabled, setVoiceEnabled] = useState(!disableVoice);
  const lastAnnouncedRef = useRef<Set<string>>(new Set());

  /**
   * Anuncia un turno usando síntesis de voz
   */
  const anunciarTurno = (llamado: TicketLlamadoDto) => {
    console.log('[PantallaEspera] 🔊 Intentando anunciar turno:', llamado);
    console.log('[PantallaEspera] 🔊 Voz habilitada:', voiceEnabled);
    console.log('[PantallaEspera] 🔊 SpeechSynthesis disponible:', 'speechSynthesis' in window);

    if (!voiceEnabled) {
      console.log('[PantallaEspera] ⚠️ Voz deshabilitada por el usuario');
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.error('[PantallaEspera] ❌ SpeechSynthesis no está disponible en este navegador');
      return;
    }

    // Crear clave única para este anuncio
    const key = `${llamado.ticket}-${llamado.ventanilla}`;

    // No anunciar si ya se anunció
    if (lastAnnouncedRef.current.has(key)) {
      console.log('[PantallaEspera] ⏭️ Turno ya anunciado, omitiendo:', key);
      return;
    }

    // Marcar como anunciado
    lastAnnouncedRef.current.add(key);
    console.log('[PantallaEspera] ✅ Turno marcado como anunciado:', key);

    // Limpiar anuncios antiguos (mantener solo los últimos 10)
    if (lastAnnouncedRef.current.size > 10) {
      const valores = Array.from(lastAnnouncedRef.current);
      lastAnnouncedRef.current = new Set(valores.slice(-10));
    }

    try {
      // Crear el mensaje
      const mensaje = `Turno ${llamado.ticket}, ventanilla ${llamado.ventanilla}`;

      console.log('[PantallaEspera] 🔊 Mensaje a anunciar:', mensaje);

      // Cancelar cualquier anuncio previo
      window.speechSynthesis.cancel();

      // Pequeño delay para asegurar que cancel() se complete
      setTimeout(() => {
        // Crear la síntesis de voz
        const utterance = new SpeechSynthesisUtterance(mensaje);

        // Configuración optimizada para Brave/Chrome
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Intentar seleccionar una voz en español
        const voices = window.speechSynthesis.getVoices();
        console.log('[PantallaEspera] 🎤 Voces disponibles:', voices.length);

        const spanishVoice = voices.find(voice =>
          voice.lang.startsWith('es') ||
          voice.lang === 'es-ES' ||
          voice.lang === 'es-MX'
        );

        if (spanishVoice) {
          utterance.voice = spanishVoice;
          console.log('[PantallaEspera] ✅ Voz en español seleccionada:', spanishVoice.name);
        } else {
          console.warn('[PantallaEspera] ⚠️ No se encontró voz en español, usando la predeterminada');
        }

        // Eventos para debugging
        utterance.onstart = () => {
          console.log('[PantallaEspera] ▶️ Reproducción de voz iniciada');
        };

        utterance.onend = () => {
          console.log('[PantallaEspera] ✅ Reproducción de voz finalizada');
        };

        utterance.onerror = (event) => {
          console.error('[PantallaEspera] ❌ Error en reproducción de voz:', event);
          console.error('[PantallaEspera] ❌ Error type:', event.error);
        };

        console.log('[PantallaEspera] 🎤 Llamando speechSynthesis.speak()');
        window.speechSynthesis.speak(utterance);
      }, 100);

    } catch (error) {
      console.error('[PantallaEspera] ❌ Error en síntesis de voz:', error);
    }
  };

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PantallaFeedAPI.ultimosLlamados();

      console.log('[PantallaEspera] 📊 Turnos actuales:', data.length);
      console.log('[PantallaEspera] 📊 Turnos anteriores:', llamados.length);

      // Detectar turnos nuevos (que no estaban en la lista anterior)
      const nuevosLlamados = data.filter(nuevoLlamado => {
        const existeAntes = llamados.some(
          existente => existente.ticket === nuevoLlamado.ticket &&
                       existente.ventanilla === nuevoLlamado.ventanilla
        );

        if (!existeAntes) {
          console.log('[PantallaEspera] 🆕 Turno NUEVO detectado:', nuevoLlamado.ticket);
          return true;
        }

        return false;
      });

      // Anunciar cada turno nuevo
      if (nuevosLlamados.length > 0) {
        console.log('[PantallaEspera] 📢 Anunciando', nuevosLlamados.length, 'turno(s) nuevo(s)');
        nuevosLlamados.forEach(llamado => {
          anunciarTurno(llamado);
        });
      }

      setLlamados(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos. Verificando conexión...');
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

  // Efecto para inicializar las voces (necesario en algunos navegadores)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Cargar las voces
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[PantallaEspera] 🎤 Voces cargadas:', voices.length);
        voices.forEach((voice, index) => {
          console.log(`[PantallaEspera] Voz ${index}: ${voice.name} (${voice.lang})`);
        });
      };

      // Las voces se cargan de forma asíncrona en algunos navegadores
      loadVoices();

      // Brave/Chrome dispara este evento cuando las voces están listas
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  useEffect(() => {
    // Cargar datos iniciales
    cargarDatos();
    cargarMediaArchivos();

    // Auto-refresh cada 10 segundos para pantalla en tiempo real
    const interval = setInterval(cargarDatos, 10000);

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

      mediaIntervalRef.current = setInterval(nextMedia, displayInterval);

      return () => {
        if (mediaIntervalRef.current) {
          clearInterval(mediaIntervalRef.current);
        }
      };
    }
  }, [mediaFiles.length, isPlaying, displayInterval]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '24px'
    }}>
      {/* Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '12px 20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: isOnline ? 'var(--success-50)' : 'var(--danger-50)',
            color: isOnline ? 'var(--success)' : 'var(--danger)',
            fontSize: '12px',
            fontWeight: 600
          }}>
            <Wifi size={14} />
            {isOnline ? 'CONECTADO' : 'SIN CONEXIÓN'}
          </div>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--danger)',
              fontSize: '12px'
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: 'var(--muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} />
            Última actualización: {formatTime(lastUpdate)}
          </div>

          {/* Botón de voz */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: voiceEnabled ? 'var(--success)' : 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            title={voiceEnabled ? 'Desactivar anuncios de voz' : 'Activar anuncios de voz'}
          >
            🔊 {voiceEnabled ? 'Voz ON' : 'Voz OFF'}
          </button>

          {/* Botón de prueba de voz */}
          <button
            onClick={() => {
              const prueba: TicketLlamadoDto = {
                ticket: 'TEST01',
                ventanilla: '1',
                servicio: 'Prueba',
                hora: new Date().toLocaleTimeString()
              };
              // Limpiar el registro para permitir el anuncio de prueba
              lastAnnouncedRef.current.clear();
              anunciarTurno(prueba);
            }}
            style={{
              background: 'none',
              border: '1px solid var(--primary)',
              cursor: 'pointer',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--primary)';
            }}
            title="Probar síntesis de voz"
          >
            🎤 Probar Voz
          </button>

          <button
            onClick={cargarDatos}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <RefreshCw size={14} style={{
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Header Principal */}
      <div style={{
        background: '#0A2342',
        color: 'white',
        padding: '32px 40px',
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 8px 25px rgba(10, 35, 66, 0.3)',
        border: '2px solid #E9C46A',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              color: '#E9C46A',
              fontFamily: "'Times New Roman', Georgia, serif"
            }}>
              ALCALDÍA MUNICIPAL DE SONSONATE OESTE
            </h1>
            <p style={{
              fontSize: '16px',
              margin: '8px 0 0 0',
              color: '#E9C46A',
              opacity: 0.85,
              fontFamily: "'Times New Roman', Georgia, serif"
            }}>
              Sistema de Gestión de Turnos
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.9)',
            padding: '10px 20px',
            borderRadius: '25px',
            border: '1px solid rgba(233, 196, 106, 0.4)',
            background: 'rgba(233, 196, 106, 0.1)'
          }}>
            <Calendar size={16} color="#E9C46A" />
            {formatDate()}
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Monitor size={24} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 500 }}>
                Turnos Activos
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
                {llamados.length}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--success)',
            background: 'var(--success-50)',
            padding: '6px 12px',
            borderRadius: '20px',
            textAlign: 'center',
            fontWeight: 600
          }}>
            EN TIEMPO REAL
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 500 }}>
                Ventanillas Activas
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
                {new Set(llamados.map(l => l.ventanilla)).size}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--warning)',
            background: 'var(--warning-50)',
            padding: '6px 12px',
            borderRadius: '20px',
            textAlign: 'center',
            fontWeight: 600
          }}>
            ATENDIENDO
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 500 }}>
                Última Actualización
              </div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                {formatTime(lastUpdate)}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--success)',
            background: 'var(--success-50)',
            padding: '6px 12px',
            borderRadius: '20px',
            textAlign: 'center',
            fontWeight: 600
          }}>
            SINCRONIZADO
          </div>
        </div>
      </div>

      {/* Main Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mediaFiles.length > 0 ? '1fr 400px' : '1fr',
        gap: '24px',
        alignItems: 'start'
      }}>

        {/* Sección Multimedia */}
        {mediaFiles.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.05)',
            position: 'relative'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#1a1a2e',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Image size={24} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Contenido Multimedia
                </h3>
              </div>

              {/* Controles multimedia */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={prevMedia}
                  style={{
                    background: 'rgba(26, 26, 46, 0.1)',
                    border: '1px solid rgba(26, 26, 46, 0.2)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#1a1a2e',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <SkipBack size={16} />
                </button>
                <button
                  onClick={togglePlayPause}
                  style={{
                    background: 'rgba(26, 26, 46, 0.1)',
                    border: '1px solid rgba(26, 26, 46, 0.2)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#1a1a2e',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={nextMedia}
                  style={{
                    background: 'rgba(26, 26, 46, 0.1)',
                    border: '1px solid rgba(26, 26, 46, 0.2)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#1a1a2e',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </div>

            {/* Contenido multimedia */}
            <div style={{
              height: '400px',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {currentMedia && (
                <>
                  {currentMedia.type === 'image' && (
                    <img
                      src={currentMedia.url}
                      alt={currentMedia.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  )}

                  {currentMedia.type === 'video' && (
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      autoPlay
                      muted
                      loop
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  )}

                  {currentMedia.type === 'audio' && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '20px',
                      color: 'white',
                      padding: '40px'
                    }}>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Monitor size={48} color="#1a1a2e" />
                      </div>
                      <h3 style={{ margin: 0, textAlign: 'center' }}>{currentMedia.name}</h3>
                      <audio
                        ref={audioRef}
                        src={currentMedia.url}
                        autoPlay
                        controls
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {currentMedia.type === 'text' && (
                    <div style={{
                      color: 'white',
                      padding: '40px',
                      fontSize: '18px',
                      lineHeight: '1.6',
                      textAlign: 'center'
                    }}>
                      {currentMedia.description || currentMedia.name}
                    </div>
                  )}

                  {/* Indicador de archivo actual */}
                  <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '15px',
                    fontSize: '12px'
                  }}>
                    {currentMediaIndex + 1} de {mediaFiles.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Lista de Turnos */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Monitor size={28} />
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                Turnos Siendo Atendidos
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Atención en ventanillas - Por favor manténgase atento
              </p>
            </div>
          </div>

        <div style={{ padding: '32px' }}>
          {loading && llamados.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: 'var(--muted)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'var(--primary)'
              }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                Cargando turnos...
              </div>
              <div style={{ fontSize: '14px' }}>
                Conectando con el sistema
              </div>
            </div>
          ) : llamados.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              background: 'linear-gradient(135deg, var(--success-50), var(--primary-50))',
              borderRadius: '16px',
              border: '2px dashed var(--success)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: 'white'
              }}>
                <Monitor size={40} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)', marginBottom: '12px' }}>
                ¡Todas las ventanillas disponibles!
              </div>
              <div style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>
                No hay turnos siendo atendidos en este momento
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Puede acercarse a cualquier ventanilla disponible
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {llamados.map((ticket, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))',
                    border: '2px solid var(--primary)',
                    borderRadius: '20px',
                    padding: '32px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeInUp 0.6s ease-out',
                    animationDelay: `${idx * 0.1}s`,
                    animationFillMode: 'both'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: 'var(--success)',
                    animation: 'pulse 2s infinite'
                  }}></div>

                  <div style={{
                    fontSize: '48px',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    marginBottom: '16px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {ticket.ticket}
                  </div>

                  <div style={{
                    background: 'white',
                    padding: '16px 24px',
                    borderRadius: '50px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      Diríjase a
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: 'var(--primary)'
                    }}>
                      {ticket.ventanilla}
                    </div>
                  </div>

                  {ticket.servicio && (
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--text)',
                      background: 'rgba(255,255,255,0.8)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: 500
                    }}>
                      {ticket.servicio}
                    </div>
                  )}

                  {ticket.hora && (
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--muted)',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} />
                      {ticket.hora}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

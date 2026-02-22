import {
    getConversations,
    getMessages,
    getOrCreateConversation,
    markMessagesAsRead,
    sendMessage,
    subscribeToMessages,
    type Conversation,
    type Message,
} from '@/lib/api/messages';
import { getProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Check, CheckCheck, ChevronLeft, Loader2, MessageCircle, Send, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const MESSAGES_TARGET_USER_KEY = 'pelagos_messages_target_user_id';

interface MessagesScreenProps {
  onNavigate: (screen: string) => void;
}

export function MessagesScreen({ onNavigate }: MessagesScreenProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Obtener usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Cargar conversaciones
  const loadConversations = useCallback(async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (e) {
      console.error('Error cargando conversaciones:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Comprobar si hay un usuario target (desde Pescasub)
  useEffect(() => {
    const checkTargetUser = async () => {
      try {
        const targetId = sessionStorage.getItem(MESSAGES_TARGET_USER_KEY);
        if (targetId && currentUserId) {
          sessionStorage.removeItem(MESSAGES_TARGET_USER_KEY);

          // Obtener o crear conversación
          const conversationId = await getOrCreateConversation(targetId);

          // Obtener perfil del otro usuario
          const profile = await getProfile(targetId);

          // Crear objeto de conversación
          const newConv: Conversation = {
            id: conversationId,
            user1_id: currentUserId < targetId ? currentUserId : targetId,
            user2_id: currentUserId < targetId ? targetId : currentUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            other_user: {
              id: targetId,
              display_name: profile?.display_name || null,
              avatar_url: profile?.avatar_url || null,
            },
            unread_count: 0,
          };

          // Abrir la conversación
          setActiveConversation(newConv);

          // Recargar conversaciones
          loadConversations();
        }
      } catch (e) {
        console.error('Error abriendo conversación:', e);
      }
    };

    if (currentUserId) {
      checkTargetUser();
    }
  }, [currentUserId, loadConversations]);

  // Cargar mensajes cuando se abre una conversación
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await getMessages(activeConversation.id);
        setMessages(msgs);

        // Marcar como leídos
        await markMessagesAsRead(activeConversation.id);
        loadConversations(); // Actualizar contadores

        // Suscribirse a nuevos mensajes y actualizaciones
        unsubscribe = subscribeToMessages(
          activeConversation.id,
          // Nuevo mensaje
          (newMsg) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Si el mensaje es del otro usuario, marcarlo como leído
            if (newMsg.sender_id !== currentUserId) {
              markMessagesAsRead(activeConversation.id);
              loadConversations();
            }
          },
          // Mensaje actualizado (ej: marcado como leído)
          (updatedMsg) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        );
      } catch (e) {
        console.error('Error cargando mensajes:', e);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      unsubscribe?.();
    };
  }, [activeConversation, currentUserId, loadConversations]);

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessage(activeConversation.id, content);
      loadConversations();
    } catch (e) {
      console.error('Error enviando mensaje:', e);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  // Vista de conversación activa
  if (activeConversation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20">
          <div className="px-4 py-3 flex items-center gap-3">
            <motion.button
              onClick={() => setActiveConversation(null)}
              whileTap={{ scale: 0.9 }}
              className="p-2 -ml-1 rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 text-cyan-400" />
            </motion.button>

            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-cyan-400/30 flex items-center justify-center">
              {activeConversation.other_user?.avatar_url ? (
                <img
                  src={activeConversation.other_user.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-cyan-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-white font-medium truncate">
                {activeConversation.other_user?.display_name || 'Usuario'}
              </h1>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-cyan-400/50 mx-auto mb-3" />
              <p className="text-cyan-300/70 text-sm">
                Envía el primer mensaje a {activeConversation.other_user?.display_name || 'este usuario'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? 'bg-cyan-500/30 border border-cyan-400/30 rounded-br-md'
                        : 'bg-white/10 border border-white/10 rounded-bl-md'
                    }`}
                  >
                    <p className="text-white text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-cyan-300/50 text-xs">
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && (
                        msg.read_at ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-cyan-300/50" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 backdrop-blur-xl bg-[#0a1628]/90 border-t border-cyan-400/20 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="flex-1 rounded-2xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none max-h-32"
              style={{ minHeight: '48px' }}
            />
            <motion.button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-full bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Lista de conversaciones
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20">
        <div className="px-4 py-3 flex items-center gap-3">
          <motion.button
            onClick={() => onNavigate('community')}
            whileTap={{ scale: 0.9 }}
            className="p-2 -ml-1 rounded-full hover:bg-white/10 flex items-center gap-1"
          >
            <ChevronLeft className="w-6 h-6 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Volver</span>
          </motion.button>
          <h1 className="text-white text-xl font-medium">Mensajes</h1>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-8 text-center">
            <MessageCircle className="w-14 h-14 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-medium mb-2">Sin conversaciones</h2>
            <p className="text-cyan-300/80 text-sm">
              Visita Pescasub para enviar mensajes a otros usuarios.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <motion.button
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-cyan-400/20 hover:bg-white/10 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-cyan-400/30 flex items-center justify-center">
                    {conv.other_user?.avatar_url ? (
                      <img
                        src={conv.other_user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-cyan-400" />
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`font-medium truncate ${conv.unread_count > 0 ? 'text-white' : 'text-cyan-100'}`}>
                      {conv.other_user?.display_name || 'Usuario'}
                    </h3>
                    {conv.last_message && (
                      <span className="text-cyan-300/50 text-xs shrink-0">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className={`text-sm truncate mt-0.5 ${conv.unread_count > 0 ? 'text-cyan-200' : 'text-cyan-300/70'}`}>
                      {conv.last_message.sender_id === currentUserId && 'Tú: '}
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

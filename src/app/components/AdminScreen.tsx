import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
    blockUser,
    createFishingSpot,
    createHomeSection,
    createNews,
    deleteCommentAdmin,
    deleteDiveScenario,
    deleteFishingSpot,
    deleteHomeSection,
    deleteNews,
    deleteSharedDiveAdmin,
    getAdminStats,
    getAllCommentsAdmin,
    getAllDiveScenarios,
    getAllSharedDivesAdmin,
    getAllUsers,
    getBlockedUsers,
    getBroadcastHistory,
    getFishingSpots,
    getHomeSections,
    getNews,
    getReports,
    sendBroadcastMessage,
    unblockUser,
    updateHomeSection,
    updateNews,
    updateReportStatus,
    uploadAdminImage,
    type BlockedUser,
    type BroadcastMessage,
    type CommentForAdmin,
    type DiveScenario,
    type HomeSection,
    type News,
    type Report,
    type SharedDiveForAdmin,
    type UserForAdmin,
} from '@/lib/api/adminPanel';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Ban,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Edit,
    Eye,
    EyeOff,
    Home,
    ImagePlus,
    LayoutGrid,
    Loader2,
    MapPin,
    Menu,
    MessageSquare,
    Newspaper,
    Plus,
    Send,
    Shield,
    Trash2,
    Upload,
    UserX,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type AdminView =
  | 'dashboard'
  | 'news'
  | 'users'
  | 'reports'
  | 'sections'
  | 'spots'
  | 'moderation';

interface AdminScreenProps {
  onNavigate: (screen: string) => void;
}

const ADMIN_MENU = [
  { id: 'dashboard' as AdminView, label: 'Dashboard', icon: BarChart3 },
  { id: 'news' as AdminView, label: 'Noticias Pescasub', icon: Newspaper },
  { id: 'users' as AdminView, label: 'Gestionar Usuarios', icon: Users },
  { id: 'reports' as AdminView, label: 'Reportes / Mediar', icon: AlertTriangle },
  { id: 'moderation' as AdminView, label: 'Moderar Contenido', icon: Shield },
  { id: 'sections' as AdminView, label: 'Secciones Home', icon: LayoutGrid },
  { id: 'spots' as AdminView, label: 'Lugares de Pesca', icon: MapPin },
];

export function AdminScreen({ onNavigate }: AdminScreenProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const currentMenuItem = ADMIN_MENU.find((m) => m.id === currentView);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-amber-400/20">
        <div className="px-4 py-3 flex items-center gap-3">
          <motion.button
            onClick={() => onNavigate('home')}
            whileTap={{ scale: 0.9 }}
            className="p-2 -ml-1 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5 text-amber-400" />
          </motion.button>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 hover:bg-amber-500/30 transition-colors">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-amber-200 font-medium text-sm">
                  {currentMenuItem?.label || 'Admin'}
                </span>
                <Menu className="w-4 h-4 text-amber-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px] bg-[#0c1f3a] border-amber-400/30">
              {ADMIN_MENU.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => { setCurrentView(id); setMenuOpen(false); }}
                  className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer ${
                    currentView === id ? 'bg-amber-500/20 text-amber-200' : 'text-white hover:bg-amber-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4 text-amber-400" />
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-amber-400/20" />
              <DropdownMenuItem
                onClick={() => onNavigate('home')}
                className="flex items-center gap-3 py-2.5 px-3 cursor-pointer text-white hover:bg-amber-500/10"
              >
                <Home className="w-4 h-4 text-amber-400" />
                <span>Volver a la App</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <span className="text-amber-400/60 text-xs">Panel Admin</span>
        </div>
      </div>

      <div className="p-4">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'news' && <NewsView />}
        {currentView === 'users' && <UsersView />}
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'moderation' && <ModerationView />}
        {currentView === 'sections' && <SectionsView />}
        {currentView === 'spots' && <SpotsView />}
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================
function DashboardView() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const statItems = [
    { label: 'Usuarios totales', value: stats?.totalUsers || 0, icon: Users },
    { label: 'Usuarios bloqueados', value: stats?.blockedUsers || 0, icon: UserX },
    { label: 'Reportes pendientes', value: stats?.pendingReports || 0, icon: AlertTriangle },
    { label: 'Noticias', value: stats?.totalNews || 0, icon: Newspaper },
    { label: 'Jornadas compartidas', value: stats?.totalDives || 0, icon: ImagePlus },
    { label: 'Ligas/Campeonatos', value: stats?.totalLeagues || 0, icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-medium mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map(({ label, value, icon: Icon }) => (
          <div key={label} className="backdrop-blur-xl bg-white/5 rounded-2xl border border-amber-400/20 p-4">
            <Icon className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-white text-2xl font-bold">{value}</p>
            <p className="text-amber-300/70 text-xs">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== NOTICIAS con carrusel ====================
function NewsView() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', link_url: '', is_published: true });
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getNews(true);
    setNews(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingNews(null);
    setFormData({ title: '', content: '', link_url: '', is_published: true });
    setImages([]);
    setShowForm(true);
  };

  const openEdit = (n: News) => {
    setEditingNews(n);
    setFormData({ title: n.title, content: n.content || '', link_url: n.link_url || '', is_published: n.is_published });
    setImages(n.images || []);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingImages(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadAdminImage(file, 'news');
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      if (editingNews) {
        await updateNews(editingNews.id, { ...formData, images });
      } else {
        await createNews({ ...formData, images });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta noticia?')) return;
    await deleteNews(id);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-medium">Noticias Pescasub</h2>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/30 text-amber-200 text-sm border border-amber-400/30">
          <Plus className="w-4 h-4" /> Nueva
        </motion.button>
      </div>

      {news.length === 0 ? (
        <EmptyState text="No hay noticias" />
      ) : (
        <div className="space-y-3">
          {news.map((n) => (
            <div key={n.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-4">
              {n.images && n.images.length > 0 && <ImageCarousel images={n.images} />}
              <div className="flex items-start justify-between gap-3 mt-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium">{n.title}</h3>
                    {!n.is_published && <span className="text-xs px-2 py-0.5 rounded bg-gray-500/30 text-gray-300">Borrador</span>}
                  </div>
                  {n.content && <p className="text-amber-300/70 text-sm line-clamp-2">{n.content}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(n)} className="p-2 rounded-lg hover:bg-white/10 text-amber-400"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(n.id)} className="p-2 rounded-lg hover:bg-white/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal show={showForm} onClose={() => setShowForm(false)} title={editingNews ? 'Editar Noticia' : 'Nueva Noticia'}>
        <div className="space-y-4">
          <input type="text" placeholder="Título" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50" />
          <textarea placeholder="Contenido" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={4} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50 resize-none" />

          <div>
            <label className="text-amber-200 text-sm mb-2 block">Imágenes (carrusel)</label>
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-amber-400/30">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-200 text-sm border border-amber-400/30">
              {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir imágenes
            </button>
          </div>

          <input type="url" placeholder="URL de enlace (opcional)" value={formData.link_url} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50" />
          <label className="flex items-center gap-3 text-amber-200">
            <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })} className="w-5 h-5 rounded border-amber-400/30" />
            Publicar inmediatamente
          </label>
          <button onClick={handleSave} disabled={saving || !formData.title.trim()} className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar'}
          </button>
        </div>
      </FormModal>
    </div>
  );
}

// ==================== USUARIOS con mensajes masivos ====================
function UsersView() {
  const [users, setUsers] = useState<UserForAdmin[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'blocked' | 'broadcast'>('all');
  const [blockingUser, setBlockingUser] = useState<UserForAdmin | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastMessage[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersData, blockedData, historyData] = await Promise.all([getAllUsers(), getBlockedUsers(), getBroadcastHistory()]);
    setUsers(usersData);
    setBlockedUsers(blockedData);
    setBroadcastHistory(historyData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBlock = async () => {
    if (!blockingUser) return;
    await blockUser(blockingUser.id, blockReason || undefined);
    setBlockingUser(null);
    setBlockReason('');
    load();
  };

  const handleUnblock = async (userId: string) => {
    if (!confirm('¿Desbloquear este usuario?')) return;
    await unblockUser(userId);
    load();
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastContent.trim()) return;
    setBroadcasting(true);
    try {
      await sendBroadcastMessage(broadcastTitle, broadcastContent);
      setBroadcastTitle('');
      setBroadcastContent('');
      load();
      alert('Mensaje enviado a todos los usuarios');
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-medium">Gestionar Usuarios</h2>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${tab === 'all' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' : 'bg-white/5 text-amber-300/70'}`}>
          Todos ({users.length})
        </button>
        <button onClick={() => setTab('blocked')} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${tab === 'blocked' ? 'bg-red-500/30 text-red-200 border border-red-400/30' : 'bg-white/5 text-amber-300/70'}`}>
          Bloqueados ({blockedUsers.length})
        </button>
        <button onClick={() => setTab('broadcast')} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${tab === 'broadcast' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30' : 'bg-white/5 text-amber-300/70'}`}>
          <Send className="w-3 h-3 inline mr-1" /> Mensaje Masivo
        </button>
      </div>

      {tab === 'all' && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/30 flex items-center justify-center overflow-hidden border border-amber-400/30">
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-amber-200 text-xs">{(u.display_name || 'U').slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{u.display_name || 'Sin nombre'}</p>
                <div className="flex items-center gap-2">
                  {u.is_app_admin && <span className="text-amber-400 text-xs">Admin</span>}
                  {u.is_blocked && <span className="text-red-400 text-xs">Bloqueado</span>}
                </div>
              </div>
              {!u.is_app_admin && (
                u.is_blocked ? (
                  <button onClick={() => handleUnblock(u.id)} className="p-2 rounded-lg bg-green-500/20 text-green-400"><Eye className="w-4 h-4" /></button>
                ) : (
                  <button onClick={() => setBlockingUser(u)} className="p-2 rounded-lg bg-red-500/20 text-red-400"><Ban className="w-4 h-4" /></button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'blocked' && (blockedUsers.length === 0 ? <EmptyState text="No hay usuarios bloqueados" /> : (
        <div className="space-y-2">
          {blockedUsers.map((b) => (
            <div key={b.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-red-400/20 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/30 flex items-center justify-center overflow-hidden border border-red-400/30">
                {b.user_profile?.avatar_url ? <img src={b.user_profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserX className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{b.user_profile?.display_name || 'Usuario'}</p>
                {b.reason && <p className="text-red-300/70 text-xs truncate">{b.reason}</p>}
              </div>
              <button onClick={() => handleUnblock(b.user_id)} className="p-2 rounded-lg bg-green-500/20 text-green-400"><Eye className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      ))}

      {tab === 'broadcast' && (
        <div className="space-y-4">
          <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-blue-400/20 p-4">
            <h3 className="text-blue-200 font-medium mb-3">Enviar mensaje a todos los usuarios</h3>
            <input type="text" placeholder="Título del mensaje" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} className="w-full rounded-xl bg-white/10 border border-blue-400/30 px-4 py-3 text-white placeholder-blue-400/50 mb-3" />
            <textarea placeholder="Contenido del mensaje" value={broadcastContent} onChange={(e) => setBroadcastContent(e.target.value)} rows={4} className="w-full rounded-xl bg-white/10 border border-blue-400/30 px-4 py-3 text-white placeholder-blue-400/50 resize-none mb-3" />
            <button onClick={handleBroadcast} disabled={broadcasting || !broadcastTitle.trim() || !broadcastContent.trim()} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {broadcasting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar a {users.length} usuarios</>}
            </button>
          </div>
          {broadcastHistory.length > 0 && (
            <div>
              <h3 className="text-amber-200 text-sm mb-2">Historial de mensajes</h3>
              <div className="space-y-2">
                {broadcastHistory.slice(0, 5).map((m) => (
                  <div key={m.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-3">
                    <p className="text-white text-sm font-medium">{m.title}</p>
                    <p className="text-amber-300/70 text-xs">{new Date(m.sent_at).toLocaleString('es-ES')} • {m.recipient_count} destinatarios</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <FormModal show={!!blockingUser} onClose={() => setBlockingUser(null)} title="Bloquear Usuario">
        <div className="space-y-4">
          <p className="text-amber-200">¿Bloquear a <strong>{blockingUser?.display_name}</strong>?</p>
          <textarea placeholder="Razón del bloqueo (opcional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} rows={3} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50 resize-none" />
          <button onClick={handleBlock} className="w-full py-3 rounded-xl bg-red-500 text-white font-medium">Bloquear Usuario</button>
        </div>
      </FormModal>
    </div>
  );
}

// ==================== REPORTES ====================
function ReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getReports(filter || undefined);
    setReports(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: string, status: Report['status']) => {
    await updateReportStatus(id, status);
    load();
  };

  if (loading) return <LoadingSpinner />;

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-500/30 text-yellow-300',
    reviewing: 'bg-blue-500/30 text-blue-300',
    resolved: 'bg-green-500/30 text-green-300',
    dismissed: 'bg-gray-500/30 text-gray-300',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-medium">Reportes / Mediar</h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['pending', 'reviewing', 'resolved', 'dismissed', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${filter === s ? 'bg-amber-500/30 text-amber-200' : 'bg-white/5 text-amber-300/70'}`}>
            {s === '' ? 'Todos' : s === 'pending' ? 'Pendientes' : s === 'reviewing' ? 'Revisando' : s === 'resolved' ? 'Resueltos' : 'Descartados'}
          </button>
        ))}
      </div>
      {reports.length === 0 ? <EmptyState text="No hay reportes" /> : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  <span className="text-amber-300/50 text-xs ml-2">{r.reported_content_type}</span>
                </div>
                <span className="text-amber-300/50 text-xs">{new Date(r.created_at).toLocaleDateString('es-ES')}</span>
              </div>
              <p className="text-white text-sm mb-2">{r.reason}</p>
              <div className="flex items-center gap-2 text-xs text-amber-300/70">
                <span>De: {r.reporter_profile?.display_name || 'Usuario'}</span>
                {r.reported_user_profile && <span>→ {r.reported_user_profile.display_name}</span>}
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleStatus(r.id, 'reviewing')} className="flex-1 py-2 rounded-lg bg-blue-500/30 text-blue-200 text-xs">Revisar</button>
                  <button onClick={() => handleStatus(r.id, 'resolved')} className="flex-1 py-2 rounded-lg bg-green-500/30 text-green-200 text-xs">Resolver</button>
                  <button onClick={() => handleStatus(r.id, 'dismissed')} className="flex-1 py-2 rounded-lg bg-gray-500/30 text-gray-200 text-xs">Descartar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== MODERACIÓN ====================
function ModerationView() {
  const [tab, setTab] = useState<'dives' | 'comments'>('dives');
  const [dives, setDives] = useState<SharedDiveForAdmin[]>([]);
  const [comments, setComments] = useState<CommentForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingItem, setDeletingItem] = useState<{ type: 'dive' | 'comment'; id: string; userId?: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [divesData, commentsData] = await Promise.all([getAllSharedDivesAdmin(), getAllCommentsAdmin()]);
      setDives(divesData);
      setComments(commentsData);
    } catch {
      setDives([]);
      setComments([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deletingItem || !deleteReason.trim()) return;
    if (deletingItem.type === 'dive') {
      await deleteSharedDiveAdmin(deletingItem.id, deleteReason, deletingItem.userId);
    } else {
      await deleteCommentAdmin(deletingItem.id, deleteReason, deletingItem.userId);
    }
    setDeletingItem(null);
    setDeleteReason('');
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-medium">Moderar Contenido</h2>

      <div className="flex gap-2">
        <button onClick={() => setTab('dives')} className={`px-4 py-2 rounded-xl text-sm ${tab === 'dives' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' : 'bg-white/5 text-amber-300/70'}`}>
          Publicaciones ({dives.length})
        </button>
        <button onClick={() => setTab('comments')} className={`px-4 py-2 rounded-xl text-sm ${tab === 'comments' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' : 'bg-white/5 text-amber-300/70'}`}>
          Comentarios ({comments.length})
        </button>
      </div>

      {tab === 'dives' && (dives.length === 0 ? <EmptyState text="No hay publicaciones" /> : (
        <div className="space-y-3">
          {dives.map((d) => (
            <div key={d.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-amber-500/30 flex items-center justify-center overflow-hidden border border-amber-400/30">
                  {d.user_profile?.avatar_url ? <img src={d.user_profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-amber-200 text-xs">{(d.user_profile?.display_name || 'U').slice(0, 2).toUpperCase()}</span>}
                </div>
                <span className="text-white text-sm">{d.user_profile?.display_name || 'Usuario'}</span>
                <span className="text-amber-300/50 text-xs ml-auto">{new Date(d.created_at).toLocaleDateString('es-ES')}</span>
              </div>
              {d.photo_urls && d.photo_urls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mb-2">
                  {d.photo_urls.slice(0, 2).map((url, idx) => (
                    <img key={idx} src={url} alt="" className="h-16 w-16 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              {d.description && <p className="text-amber-300/70 text-sm line-clamp-2 mb-2">{d.description}</p>}
              <button onClick={() => setDeletingItem({ type: 'dive', id: d.id, userId: d.user_id })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs">
                <Trash2 className="w-3 h-3" /> Eliminar
              </button>
            </div>
          ))}
        </div>
      ))}

      {tab === 'comments' && (comments.length === 0 ? <EmptyState text="No hay comentarios" /> : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-3 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/30 flex items-center justify-center overflow-hidden border border-amber-400/30 flex-shrink-0">
                {c.user_profile?.avatar_url ? <img src={c.user_profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <MessageSquare className="w-4 h-4 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{c.user_profile?.display_name || 'Usuario'}</p>
                <p className="text-amber-300/70 text-xs line-clamp-2">{c.content}</p>
              </div>
              <button onClick={() => setDeletingItem({ type: 'comment', id: c.id, userId: c.user_id })} className="p-2 rounded-lg bg-red-500/20 text-red-300">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ))}

      <FormModal show={!!deletingItem} onClose={() => setDeletingItem(null)} title={`Eliminar ${deletingItem?.type === 'dive' ? 'publicación' : 'comentario'}`}>
        <div className="space-y-4">
          <p className="text-amber-200">Debes indicar el motivo de la eliminación.</p>
          <textarea placeholder="Motivo de la eliminación (requerido)" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50 resize-none" />
          <button onClick={handleDelete} disabled={!deleteReason.trim()} className="w-full py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50">Eliminar y notificar usuario</button>
        </div>
      </FormModal>
    </div>
  );
}

// ==================== SECCIONES HOME ====================
function SectionsView() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null);
  const [formData, setFormData] = useState({ title: '', subtitle: '', icon: 'Star', content_type: 'carousel' as HomeSection['content_type'], content: {} as Record<string, unknown>, is_active: true });
  const [images, setImages] = useState<string[]>([]);
  const [links, setLinks] = useState<{ url: string; label: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getHomeSections(true);
    setSections(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingSection(null);
    setFormData({ title: '', subtitle: '', icon: 'Star', content_type: 'carousel', content: {}, is_active: true });
    setImages([]);
    setLinks([]);
    setShowForm(true);
  };

  const openEdit = (s: HomeSection) => {
    setEditingSection(s);
    setFormData({ title: s.title, subtitle: s.subtitle || '', icon: s.icon, content_type: s.content_type, content: s.content, is_active: s.is_active });
    setImages(s.images || []);
    setLinks(s.links || []);
    setShowForm(true);
  };

  const addLink = () => setLinks([...links, { url: '', label: '' }]);
  const updateLink = (idx: number, field: 'url' | 'label', value: string) => {
    const updated = [...links];
    updated[idx][field] = value;
    setLinks(updated);
  };
  const removeLink = (idx: number) => setLinks(links.filter((_, i) => i !== idx));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingImages(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadAdminImage(file, 'sections');
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      const validLinks = links.filter(l => l.url.trim());
      const payload = { ...formData, images, links: validLinks } as Partial<HomeSection>;
      if (editingSection) {
        await updateHomeSection(editingSection.id, payload);
      } else {
        await createHomeSection(formData);
        if (images.length > 0 || validLinks.length > 0) {
          const created = await getHomeSections(true);
          const newSection = created.find(s => s.title === formData.title);
          if (newSection) await updateHomeSection(newSection.id, { images, links: validLinks });
        }
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sección?')) return;
    await deleteHomeSection(id);
    load();
  };

  const toggleActive = async (s: HomeSection) => {
    await updateHomeSection(s.id, { is_active: !s.is_active });
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-medium">Secciones Home</h2>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/30 text-amber-200 text-sm border border-amber-400/30">
          <Plus className="w-4 h-4" /> Nueva
        </motion.button>
      </div>

      {sections.length === 0 ? <EmptyState text="No hay secciones personalizadas" /> : (
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.id} className={`backdrop-blur-xl rounded-xl border p-3 ${s.is_active ? 'bg-white/5 border-amber-400/20' : 'bg-white/2 border-gray-400/20 opacity-60'}`}>
              {s.images && s.images.length > 0 && <ImageCarousel images={s.images} small />}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.title}</p>
                  <p className="text-amber-300/70 text-xs">{s.content_type}</p>
                </div>
                <button onClick={() => toggleActive(s)} className="p-2 rounded-lg hover:bg-white/10">
                  {s.is_active ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                </button>
                <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-white/10 text-amber-400"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-white/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal show={showForm} onClose={() => setShowForm(false)} title={editingSection ? 'Editar Sección' : 'Nueva Sección'}>
        <div className="space-y-4">
          <input type="text" placeholder="Título" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50" />
          <input type="text" placeholder="Subtítulo (opcional)" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50" />
          
          {/* Imágenes - siempre disponibles */}
          <div>
            <label className="text-amber-200 text-sm mb-2 block">Imágenes (opcional)</label>
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-amber-400/30">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-200 text-sm border border-amber-400/30">
              {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Subir imágenes
            </button>
          </div>

          {/* Contenido HTML - siempre disponible */}
          <div>
            <label className="text-amber-200 text-sm mb-2 block">Contenido (opcional)</label>
            <textarea
              placeholder="Escribe aquí el contenido de la sección..."
              value={(formData.content as { html?: string }).html || ''}
              onChange={(e) => setFormData({ ...formData, content: { html: e.target.value } })}
              rows={4}
              className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50 resize-none"
            />
            <p className="text-amber-300/50 text-xs mt-1">Puedes usar HTML básico: &lt;b&gt;, &lt;i&gt;, &lt;a&gt;, &lt;br&gt;</p>
          </div>

          {/* Enlaces múltiples */}
          <div>
            <label className="text-amber-200 text-sm mb-2 block">Enlaces (opcional)</label>
            {links.map((link, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input type="url" placeholder="URL" value={link.url} onChange={(e) => updateLink(idx, 'url', e.target.value)} className="flex-1 rounded-xl bg-white/10 border border-amber-400/30 px-3 py-2 text-white placeholder-amber-400/50 text-sm" />
                <input type="text" placeholder="Texto (ej: Ver más)" value={link.label} onChange={(e) => updateLink(idx, 'label', e.target.value)} className="w-28 rounded-xl bg-white/10 border border-amber-400/30 px-3 py-2 text-white placeholder-amber-400/50 text-sm" />
                <button onClick={() => removeLink(idx)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addLink} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-amber-300 text-sm border border-amber-400/20 hover:bg-white/10">
              <Plus className="w-4 h-4" /> Añadir enlace
            </button>
          </div>

          <label className="flex items-center gap-3 text-amber-200">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded border-amber-400/30" />
            Activa
          </label>
          <button onClick={handleSave} disabled={saving || !formData.title.trim()} className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar'}
          </button>
        </div>
      </FormModal>
    </div>
  );
}

// ==================== LUGARES DE PESCA ====================
function SpotsView() {
  const [tab, setTab] = useState<'scenarios' | 'spots'>('scenarios');
  const [scenarios, setScenarios] = useState<DiveScenario[]>([]);
  const [spots, setSpots] = useState<Array<{ id: string; name: string; lat: number; lng: number; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', lat: '', lng: '' });
  const [saving, setSaving] = useState(false);
  const [deletingScenario, setDeletingScenario] = useState<DiveScenario | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scenariosData, spotsData] = await Promise.all([
        getAllDiveScenarios(),
        getFishingSpots(),
      ]);
      setScenarios(scenariosData);
      setSpots(spotsData);
    } catch {
      setScenarios([]);
      setSpots([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteSpot = async (id: string) => {
    if (!confirm('¿Eliminar este lugar de pesca?')) return;
    await deleteFishingSpot(id);
    load();
  };

  const handleDeleteScenario = async () => {
    if (!deletingScenario || !deleteReason.trim()) return;
    await deleteDiveScenario(deletingScenario.id, deleteReason, deletingScenario.user_id);
    setDeletingScenario(null);
    setDeleteReason('');
    load();
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.lat || !formData.lng) return;
    setSaving(true);
    try {
      await createFishingSpot({
        name: formData.name,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        is_public: true,
      });
      setShowForm(false);
      setFormData({ name: '', lat: '', lng: '' });
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-white text-xl font-medium">Lugares de Pesca</h2>

      <div className="flex gap-2">
        <button onClick={() => setTab('scenarios')} className={`px-4 py-2 rounded-xl text-sm ${tab === 'scenarios' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' : 'bg-white/5 text-amber-300/70'}`}>
          Escenarios del Mapa ({scenarios.length})
        </button>
        <button onClick={() => setTab('spots')} className={`px-4 py-2 rounded-xl text-sm ${tab === 'spots' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' : 'bg-white/5 text-amber-300/70'}`}>
          Lugares Admin ({spots.length})
        </button>
      </div>

      {tab === 'scenarios' && (
        scenarios.length === 0 ? <EmptyState text="No hay escenarios de pesca en el mapa" /> : (
          <div className="space-y-2">
            {scenarios.map((s) => (
              <div key={s.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-amber-500/30 flex items-center justify-center overflow-hidden border border-amber-400/30">
                    {s.user_profile?.avatar_url ? <img src={s.user_profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-amber-200 text-xs">{(s.user_profile?.display_name || 'U').slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <span className="text-white text-sm">{s.user_profile?.display_name || 'Usuario'}</span>
                  <span className="text-amber-300/50 text-xs ml-auto">{new Date(s.dive_date).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{s.location_name || 'Sin nombre'}</p>
                    <p className="text-amber-300/70 text-xs">{s.gps_lat?.toFixed(4)}, {s.gps_lng?.toFixed(4)}</p>
                  </div>
                  <button onClick={() => setDeletingScenario(s)} className="p-2 rounded-lg bg-red-500/20 text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {s.notes && <p className="text-amber-300/60 text-xs mt-2 line-clamp-2">{s.notes}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'spots' && (
        <>
          <div className="flex justify-end">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/30 text-amber-200 text-sm border border-amber-400/30">
              <Plus className="w-4 h-4" /> Añadir
            </motion.button>
          </div>
          {spots.length === 0 ? <EmptyState text="No hay lugares de pesca registrados" /> : (
            <div className="space-y-2">
              {spots.map((s) => (
                <div key={s.id} className="backdrop-blur-xl bg-white/5 rounded-xl border border-amber-400/20 p-3 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.name}</p>
                    <p className="text-amber-300/70 text-xs">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>
                  </div>
                  <button onClick={() => handleDeleteSpot(s.id)} className="p-2 rounded-lg hover:bg-white/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <FormModal show={showForm} onClose={() => setShowForm(false)} title="Añadir Lugar de Pesca">
        <div className="space-y-4">
          <input type="text" placeholder="Nombre del lugar" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="any" placeholder="Latitud" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50" />
            <input type="number" step="any" placeholder="Longitud" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50" />
          </div>
          <button onClick={handleCreate} disabled={saving || !formData.name.trim() || !formData.lat || !formData.lng} className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar'}
          </button>
        </div>
      </FormModal>

      <FormModal show={!!deletingScenario} onClose={() => setDeletingScenario(null)} title="Eliminar Escenario">
        <div className="space-y-4">
          <p className="text-amber-200">¿Eliminar el escenario de <strong>{deletingScenario?.user_profile?.display_name}</strong>?</p>
          <textarea placeholder="Motivo de la eliminación (requerido)" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} className="w-full rounded-xl bg-white/10 border border-amber-400/30 px-4 py-3 text-white placeholder-amber-400/50 resize-none" />
          <button onClick={handleDeleteScenario} disabled={!deleteReason.trim()} className="w-full py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50">Eliminar y notificar usuario</button>
        </div>
      </FormModal>
    </div>
  );
}

// ==================== COMPONENTES AUXILIARES ====================

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-amber-400/20 p-8 text-center">
      <p className="text-amber-300/70">{text}</p>
    </div>
  );
}

function FormModal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-gradient-to-b from-[#0c1f3a] to-[#0a1628] rounded-t-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white text-lg font-medium">{title}</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-amber-400"><X className="w-5 h-5" /></button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ImageCarousel({ images, small = false }: { images: string[]; small?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
  };

  if (images.length === 0) return null;

  return (
    <div className={`relative ${small ? 'h-24' : 'h-40'} rounded-xl overflow-hidden`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>
      {images.length > 1 && (
        <>
          <button onClick={() => goTo((currentIndex - 1 + images.length) % images.length)} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => goTo((currentIndex + 1) % images.length)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <button key={idx} onClick={() => goTo(idx)} className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SmartImage from '../components/SmartImage';

const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    emergencyContact: user?.emergencyContact || ''
  });

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateUser({
        name: formData.name,
        phone: formData.phone,
        emergencyContact: formData.emergencyContact
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (isEditing) fileInputRef.current?.click();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-32">
      {/* Header Premium con Glassmorphism */}
      <div className="relative h-64 bg-black overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000"
          className="w-full h-full object-cover opacity-50"
          alt="Luxury Background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FDFCFB] via-transparent to-black/20"></div>

        <div className="absolute top-12 left-6 right-6 flex justify-between items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">{greeting}</p>
            <h1 className="text-3xl font-serif text-white font-bold">{user.name.split(' ')[0]}</h1>
          </motion.div>
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="px-6 -mt-16 relative z-10">
        {/* Tabs Switcher */}
        <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-[2rem] shadow-float border border-white/50 flex mb-8 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 rounded-full text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-black text-white shadow-lg' : 'text-text-light'}`}
          >
            Mi Perfil
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 py-3 rounded-full text-xs font-bold transition-all ${activeTab === 'bookings' ? 'bg-black text-white shadow-lg' : 'text-text-light'}`}
          >
            Mis Estancias
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'profile' ? (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 max-w-lg mx-auto"
            >
              {/* User Identity Card */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-50 text-center">
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <div
                    onClick={handleAvatarClick}
                    className={`w-full h-full rounded-full border-4 border-sand overflow-hidden shadow-xl relative group transition-all ${isEditing ? 'cursor-pointer scale-105' : ''}`}
                  >
                    <SmartImage src={user.avatar || ''} className="w-full h-full object-cover" />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="material-icons text-white">add_a_photo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" />
                </div>

                <div className="space-y-1 mb-8">
                  {isEditing ? (
                    <input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="text-2xl font-serif font-bold text-center w-full border-b border-gray-200 py-1 outline-none focus:border-primary"
                    />
                  ) : (
                    <h2 className="text-2xl font-serif font-bold text-text-main">{user.name}</h2>
                  )}
                  <p className="text-xs text-text-light font-medium tracking-wide">{user.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-sand/30 p-4 rounded-3xl">
                    <p className="text-[10px] font-bold text-text-light uppercase mb-1">Miembro desde</p>
                    <p className="text-xs font-bold text-text-main">{new Date(user.registeredAt).getFullYear()}</p>
                  </div>
                  <div className="bg-sand/30 p-4 rounded-3xl">
                    <p className="text-[10px] font-bold text-text-light uppercase mb-1">Estatus</p>
                    <p className="text-xs font-bold text-primary">VIP Gold</p>
                  </div>
                </div>
              </div>

              {/* Private Information */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-50">
                <h3 className="font-serif font-bold text-lg mb-6 text-text-main">Información Privada</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-light mb-2 block">Teléfono de contacto</label>
                    {isEditing ? (
                      <input
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-gray-50 px-4 py-3.5 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-primary/20"
                        placeholder="+1 (787) 000-0000"
                      />
                    ) : (
                      <p className="text-sm font-bold text-text-main">{user.phone || 'No registrado'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-light mb-2 block">Emergencia (Persona / Tel)</label>
                    {isEditing ? (
                      <input
                        value={formData.emergencyContact}
                        onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                        className="w-full bg-gray-50 px-4 py-3.5 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-primary/20"
                        placeholder="Nombre y relación"
                      />
                    ) : (
                      <p className="text-sm font-bold text-text-main">{user.emergencyContact || 'Sin asignar'}</p>
                    )}
                  </div>
                </div>

                <div className="mt-10">
                  {isEditing ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-4 rounded-2xl font-bold text-xs text-text-light bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-4 rounded-2xl font-bold text-xs text-white bg-black shadow-lg shadow-black/20 flex items-center justify-center gap-2"
                      >
                        {isSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                        GUARDAR CAMBIOS
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full py-4 border border-gray-200 rounded-2xl font-bold text-xs text-text-main hover:bg-gray-50 transition-colors"
                    >
                      EDITAR MI INFORMACIÓN
                    </button>
                  )}
                </div>
              </div>

              {/* Security / Account Actions */}
              <div className="flex flex-col gap-3">
                {user.email === 'villaretiror@gmail.com' && (
                  <button
                    onClick={() => {
                      localStorage.setItem('host_mode_preferred', 'true');
                      navigate('/host');
                    }}
                    className="w-full p-5 bg-primary text-white rounded-[2rem] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 uppercase tracking-widest"
                  >
                    <span className="material-icons-round text-lg">dashboard_customize</span>
                    Regresar a Panel de Host
                  </button>
                )}
                <button onClick={logout} className="w-full p-5 bg-red-50 text-red-600 rounded-[2rem] font-bold text-xs flex items-center justify-center gap-2">
                  <span className="material-icons-round text-lg text-red-400">logout</span>
                  Cerrar Sesión Segura
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bookings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 max-w-lg mx-auto"
            >
              {/* Empty State for Bookings */}
              <div className="bg-white rounded-[2.5rem] p-12 shadow-card border border-gray-50 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-sand rounded-full flex items-center justify-center mb-6">
                  <span className="material-icons-round text-3xl text-primary">calendar_today</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-text-main mb-2">Aún no tienes estancias</h3>
                <p className="text-sm text-text-light mb-8 max-w-[220px]">Tu próximo recuerdo inolvidable en Puerto Rico está a un clic.</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all"
                >
                  Descubrir nuevas villas
                </button>
              </div>

              {/* Information Note */}
              <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 flex gap-4">
                <span className="material-icons-round text-blue-400">info</span>
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  Las reservas realizadas a través de plataformas externas (Airbnb/Booking) tardan hasta 24h en verse reflejadas aquí.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Profile;

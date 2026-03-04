import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from './HostDashboard'; // Si quieres reutilizar el toast global, aunque aquí crearemos uno local para simplificar

const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guardamos la URL del avatar temporal para limpiarla después y evitar memory leaks
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    emergencyContact: user?.emergencyContact || ''
  });

  // Limpieza de ObjectURL en desmontaje o cambio
  useEffect(() => {
    return () => {
      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
      }
    };
  }, [tempAvatarUrl]);

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación Básica: Máximo 2MB
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("La imagen no debe superar los 2MB.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    // Limpiamos la URL anterior si existía
    if (tempAvatarUrl) {
      URL.revokeObjectURL(tempAvatarUrl);
    }

    const newUrl = URL.createObjectURL(file);
    setTempAvatarUrl(newUrl);
    // Auto-update temporal para visualización
    updateUser({ avatar: newUrl });
  };

  const handleSave = () => {
    updateUser({
      name: formData.name,
      phone: formData.phone,
      emergencyContact: formData.emergencyContact
    });
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-24 overflow-hidden relative">

      {/* Toast de Error Simple */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-float font-bold text-sm"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Cover con Gradiente de Atardecer */}
      <div className="relative h-56 bg-gradient-to-br from-primary via-orange-400 to-secondary opacity-90 shadow-inner">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={logout}
            className="bg-white/10 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-xs font-bold border border-white/30 hover:bg-white/20 transition-all active:scale-95 shadow-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Profile Card Main Animada */}
      <div className="px-5 -mt-20 relative z-10 w-full max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-[2.5rem] shadow-float p-8 text-center border border-gray-50/50 relative overflow-hidden"
        >
          {/* Decoración sutil de fondo */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-sand/50 to-transparent z-0 pointer-events-none"></div>

          <div className="relative z-10 mb-6 flex flex-col items-center">
            <div
              onClick={handleAvatarClick}
              className={`w-32 h-32 rounded-[2.5rem] p-1 bg-white shadow-xl overflow-hidden relative group transition-all duration-300 ${isEditing ? 'cursor-pointer hover:shadow-primary/20 hover:scale-105' : ''}`}
              style={{ borderRadius: '35%' }} // Forma de Squircle Orgánico
            >
              <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-gray-50 flex items-center justify-center relative" style={{ borderRadius: '32%' }}>
                {tempAvatarUrl || user.avatar ? (
                  <img src={tempAvatarUrl || user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-icons text-6xl text-gray-300">person</span>
                )}
                {/* Glassmorphism Hover Overlay */}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="material-icons text-white text-3xl drop-shadow-md">add_a_photo</span>
                  </div>
                )}
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} />
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing-name"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex justify-center"
              >
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="text-2xl font-serif font-bold text-center text-text-main bg-transparent border-b-2 border-primary outline-none pb-1 w-3/4 focus:border-orange-500 transition-colors"
                  placeholder="Tu Nombre"
                  autoFocus
                />
              </motion.div>
            ) : (
              <motion.div
                key="view-name"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <h1 className="text-3xl font-serif font-bold text-text-main capitalize tracking-tight">
                  {user.name || 'Huésped'}
                </h1>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-sm font-medium text-text-light mt-2 mb-6">{user.email}</p>

          <AnimatePresence mode="wait">
            {!isEditing && (
              <motion.button
                key="edit-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditing(true)}
                className="bg-sand/50 hover:bg-sand text-primary font-bold text-sm px-6 py-2.5 rounded-full transition-colors"
              >
                Editar Perfil
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Datos de Contacto */}
      <div className="px-5 mt-8 w-full max-w-lg mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="bg-white rounded-[2.5rem] p-8 shadow-float border border-gray-50/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-secondary">
              <span className="material-icons text-[20px]">contact_phone</span>
            </div>
            <h3 className="font-bold text-lg text-text-main font-serif">Info de Estancia</h3>
          </div>

          <p className="text-[13px] text-text-light mb-8 leading-relaxed">
            Completa estos datos para agilizar tu check-in y permitirnos contactarte durante tu visita a nuestras villas.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-light mb-2 ml-1">Teléfono Móvil</label>
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.input
                    key="edit-phone"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3.5 bg-gray-50/50 border border-transparent focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl outline-none transition-all text-sm font-medium text-text-main shadow-sm"
                    placeholder="+1 (787) 000-0000"
                  />
                ) : (
                  <motion.div
                    key="view-phone"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-transparent"
                  >
                    <span className="material-icons text-gray-400 text-[18px]">phone</span>
                    <span className={`text-sm font-medium ${user.phone ? 'text-text-main' : 'text-gray-400 italic'}`}>
                      {user.phone || "No especificado"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-light mb-2 ml-1">Contacto de Emergencia</label>
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.input
                    key="edit-emer"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    value={formData.emergencyContact}
                    onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full px-4 py-3.5 bg-gray-50/50 border border-transparent focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl outline-none transition-all text-sm font-medium text-text-main shadow-sm"
                    placeholder="Nombre completo y Teléfono"
                  />
                ) : (
                  <motion.div
                    key="view-emer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-transparent"
                  >
                    <span className="material-icons text-gray-400 text-[18px]">medical_services</span>
                    <span className={`text-sm font-medium ${user.emergencyContact ? 'text-text-main' : 'text-gray-400 italic'}`}>
                      {user.emergencyContact || "No especificado"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="flex gap-3 overflow-hidden"
              >
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3.5 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  Guardar Cambios
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;

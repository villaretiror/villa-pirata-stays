import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    emergencyContact: user?.emergencyContact || ''
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fakeUrl = URL.createObjectURL(e.target.files[0]);
      updateUser({ avatar: fakeUrl });
    }
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
    <div className="min-h-screen bg-sand pb-24 animate-fade-in">
      {/* Header / Cover */}
      <div className="relative h-48 bg-gradient-to-r from-secondary to-primary opacity-90">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-4 right-4 z-10">
          <button 
             onClick={logout}
             className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/30 hover:bg-white/30 transition-colors"
          >
             Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Profile Card Main */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-float p-6 text-center border border-gray-100">
           
           <div className="relative inline-block mb-4">
              <div 
                onClick={handleAvatarClick}
                className="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden cursor-pointer group relative bg-gray-100"
              >
                {user.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <span className="material-icons text-5xl">person</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-icons text-white">photo_camera</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
           </div>

           {isEditing ? (
             <input 
               value={formData.name}
               onChange={e => setFormData({...formData, name: e.target.value})}
               className="text-2xl font-serif font-bold text-center text-text-main border-b border-gray-300 outline-none pb-1 w-full"
               placeholder="Tu Nombre"
             />
           ) : (
             <h1 className="text-2xl font-serif font-bold text-text-main capitalize">
                {user.name || 'Huésped'}
             </h1>
           )}
           
           <p className="text-sm text-text-light mt-1 mb-4">{user.email}</p>

           {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-primary font-bold text-sm underline"
              >
                Editar Perfil
              </button>
           )}
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* Datos de Contacto */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-100">
           <div className="flex items-center gap-2 mb-4">
              <span className="material-icons text-secondary">contact_phone</span>
              <h3 className="font-bold text-text-main">Información de Estancia</h3>
           </div>
           
           <p className="text-xs text-text-light mb-6">
             Completa estos datos para agilizar tu check-in y permitirnos contactarte durante tu visita.
           </p>
           
           <div className="space-y-4">
              <div>
                 <label className="block text-xs font-bold uppercase text-text-light mb-1">Teléfono Móvil</label>
                 {isEditing ? (
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                      placeholder="+1 (787) 000-0000"
                    />
                 ) : (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                       <span className="material-icons text-gray-400 text-sm">phone</span>
                       <span className="text-sm font-medium text-text-main">{user.phone || "No especificado"}</span>
                    </div>
                 )}
              </div>

              <div>
                 <label className="block text-xs font-bold uppercase text-text-light mb-1">Contacto de Emergencia</label>
                 {isEditing ? (
                    <input 
                      value={formData.emergencyContact}
                      onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                      placeholder="Nombre y Teléfono"
                    />
                 ) : (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                       <span className="material-icons text-gray-400 text-sm">medical_services</span>
                       <span className="text-sm font-medium text-text-main">{user.emergencyContact || "No especificado"}</span>
                    </div>
                 )}
              </div>
           </div>

           {isEditing && (
              <div className="mt-6 flex gap-3">
                 <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-50 rounded-xl">Cancelar</button>
                 <button onClick={handleSave} className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20">Guardar</button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

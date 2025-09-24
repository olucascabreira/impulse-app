import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Building2, 
  Bell, 
  Palette, 
  Shield, 
  Save, 
  Key,
  Mail,
  Phone,
  Globe,
  CreditCard,
  Users,
  Settings as SettingsIcon,
  Check,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Image,
  Upload,
  Camera
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/hooks/use-companies';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings profile={profile} user={user} />;
      case 'company':
        return <CompanySettings />;
      case 'users':
        return <UserManagement />;
      case 'notifications':
        return <NotificationSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'security':
        return <SecuritySettings />;
      default:
        return <ProfileSettings profile={profile} user={user} />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e configurações do sistema</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:w-64">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-2"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </Button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {tabs.find(tab => tab.id === activeTab)?.icon && 
                  React.createElement(tabs.find(tab => tab.id === activeTab)?.icon || SettingsIcon, { className: "h-5 w-5" })
                }
                {tabs.find(tab => tab.id === activeTab)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Profile Settings Component
const ProfileSettings = ({ profile, user }: { profile: any; user: any }) => {
  const [name, setName] = useState(profile?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.telefone || '');
  const [position, setPosition] = useState(profile?.cargo || '');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { updateProfile, uploadUserProfilePicture, removeUserProfilePicture } = useAuth();

  useEffect(() => {
    if (profile) {
      setName(profile.nome || '');
      setPhone(profile.telefone || '');
      setPosition(profile.cargo || '');
      setProfilePicturePreview(profile.photo_url || null);
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (phone && !/^\(\d{2}\) \d{4,5}-\d{4}$/.test(phone)) {
      newErrors.phone = 'Telefone inválido. Use o formato (00) 00000-0000';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Update profile information
      const profileUpdates = {
        nome: name.trim(),
        telefone: phone || null,
        cargo: position.trim() || null,
      };
      
      const profileResult = await updateProfile(profileUpdates);
      
      if (profileResult.error) throw profileResult.error;
      
      // Update user email if changed
      if (email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        });
        
        if (emailError) throw emailError;
      }
      
      // Upload profile picture if selected
      if (profilePictureFile) {
        const pictureResult = await uploadUserProfilePicture(profilePictureFile);
        if (pictureResult.error) throw pictureResult.error;
      }
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar suas informações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    } else if (digits.length > 2) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePictureFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = async () => {
    const result = await removeUserProfilePicture();
    if (!result.error) {
      setProfilePicturePreview(null);
      setProfilePictureFile(null);
    }
  };

  // Get initials for the avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 
      ? names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase()
      : names[0][0].toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Informações do Perfil</h3>
        <p className="text-sm text-muted-foreground">
          Atualize suas informações pessoais e preferências de contato.
        </p>
      </div>
      
      <Separator />
      
      {/* Profile Picture Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Foto de Perfil</label>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={profilePicturePreview || profile?.photo_url || ""} 
                alt={profile?.nome || "User"} 
              />
              <AvatarFallback className="text-lg">
                {getInitials(profile?.nome || user?.email || "User")}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
                id="profile-picture-upload"
              />
              <label htmlFor="profile-picture-upload">
                <Button asChild variant="outline" size="sm">
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Alterar Foto
                  </span>
                </Button>
              </label>
              {(profile?.photo_url || profilePicturePreview) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRemoveProfilePicture}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Formatos suportados: PNG, JPG (máx. 2MB)
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome Completo</label>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.name ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.email ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Telefone</label>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.phone ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Cargo</label>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Seu cargo na empresa"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// Company Settings Component
const CompanySettings = () => {
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [industry, setIndustry] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currentCompany, updateCompany, uploadCompanyLogo, removeCompanyLogo } = useCompanies();

  useEffect(() => {
    if (currentCompany) {
      setCompanyName(currentCompany.name || '');
      setCnpj(currentCompany.cnpj || '');
      setCompanyPhone(currentCompany.phone || '');
      setWebsite(currentCompany.website || '');
      setEmail(currentCompany.email || '');
      
      // Parse the combined address string into separate components
      if (currentCompany.address) {
        const addressParts = currentCompany.address.split(', ');
        if (addressParts.length >= 1) setStreet(addressParts[0] || '');
        if (addressParts.length >= 2) {
          const secondPart = addressParts[1];
          // Check if it looks like a number (all digits) or neighborhood
          if (/^\d+$/.test(secondPart.trim())) {
            setNumber(secondPart.trim());
            if (addressParts.length >= 3) setNeighborhood(addressParts[2] || '');
            if (addressParts.length >= 4) setComplement(addressParts[3] || '');
          } else {
            setNeighborhood(secondPart || '');
            if (addressParts.length >= 3) setComplement(addressParts[2] || '');
          }
        }
      }
      
      setCity(currentCompany.city || '');
      setState(currentCompany.state || '');
      setZipcode(currentCompany.zipcode || '');
      setIndustry(currentCompany.industry || '');
    }
  }, [currentCompany]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!companyName.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório';
    }
    
    if (cnpj && !isValidCNPJ(cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }
    
    if (companyPhone && !isValidPhone(companyPhone)) {
      newErrors.phone = 'Telefone inválido. Use o formato (00) 00000-0000';
    }
    
    if (website && !isValidURL(website)) {
      newErrors.website = 'Website inválido. Deve começar com http:// ou https://';
    }
    
    if (email && !isValidEmail(email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (zipcode && !isValidZipcode(zipcode)) {
      newErrors.zipcode = 'CEP inválido. Use o formato 00000-000';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidCNPJ = (cnpj: string) => {
    // Simple CNPJ validation (removing formatting characters)
    const cleaned = cnpj.replace(/[^\d]/g, '');
    return cleaned.length === 14;
  };

  const isValidPhone = (phone: string) => {
    // Simple phone validation
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const isValidURL = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidZipcode = (zipcode: string) => {
    // Simple zipcode validation (removing formatting characters)
    const cleaned = zipcode.replace(/[^\d]/g, '');
    return cleaned.length === 8;
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 14);
    
    let formatted = digits;
    if (digits.length > 12) {
      formatted = `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/${digits.substring(8, 12)}-${digits.substring(12)}`;
    } else if (digits.length > 8) {
      formatted = `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/${digits.substring(8)}`;
    } else if (digits.length > 5) {
      formatted = `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.substring(0, 2)}.${digits.substring(2)}`;
    }
    
    return formatted;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    } else if (digits.length > 2) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    
    return formatted;
  };

  const formatZipcode = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 8);
    
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.substring(0, 5)}-${digits.substring(5)}`;
    }
    
    return formatted;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setCompanyPhone(formatted);
  };

  const handleZipcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatZipcode(e.target.value);
    setZipcode(formatted);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentCompany?.id) return;
    
    const result = await removeCompanyLogo(currentCompany.id);
    if (!result.error) {
      setLogoPreview(null);
      setLogoFile(null);
    }
  };

  const handleSaveCompany = async () => {
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentCompany?.id) return;
    
    setIsSaving(true);
    
    try {
      // Combine address components for the existing address field
      const addressParts = [];
      if (street) addressParts.push(street.trim());
      if (number) addressParts.push(number.trim());
      if (neighborhood) addressParts.push(neighborhood.trim());
      if (complement) addressParts.push(complement.trim());
      const combinedAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
      
      // Update company information with only existing database columns
      const updates: any = {
        name: companyName.trim(),
        cnpj: cnpj || null,
        phone: companyPhone || null,
        website: website.trim() || null,
        email: email.trim() || null,
        address: combinedAddress, // Store the combined address in the existing field
        city: city.trim() || null,
        state: state.trim() || null,
        zipcode: zipcode || null,
        industry: industry.trim() || null,
      };
      
      const result = await updateCompany(currentCompany.id, updates);
      
      if (result.error) throw result.error;
      
      // Upload logo if selected
      if (logoFile) {
        const logoResult = await uploadCompanyLogo(currentCompany.id, logoFile);
        if (logoResult.error) throw logoResult.error;
      }
      
      toast({
        title: "Empresa atualizada",
        description: "As informações da empresa foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar as informações da empresa.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Informações da Empresa</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as informações da sua empresa.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome da Empresa *</label>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.name ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">CNPJ</label>
          <input
            type="text"
            value={cnpj}
            onChange={handleCNPJChange}
            placeholder="00.000.000/0000-00"
            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.cnpj ? 'border-red-500' : ''}`}
          />
          {errors.cnpj && <p className="text-sm text-red-500">{errors.cnpj}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Telefone</label>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <input
              type="tel"
              value={companyPhone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.phone ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Website</label>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.suaempresa.com"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.website ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.website && <p className="text-sm text-red-500">{errors.website}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@suaempresa.com"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.email ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Segmento</label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Ex: Tecnologia, Varejo, Serviços, etc."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Rua</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Nome da rua ou avenida"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Número</label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Número"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Bairro</label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Nome do bairro"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Complemento</label>
            <input
              type="text"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
              placeholder="Ex: Apto, Bloco, Sala"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Nome da cidade"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="UF"
              maxLength={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">CEP</label>
          <input
            type="text"
            value={zipcode}
            onChange={handleZipcodeChange}
            placeholder="00000-000"
            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.zipcode ? 'border-red-500' : ''}`}
          />
          {errors.zipcode && <p className="text-sm text-red-500">{errors.zipcode}</p>}
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Logo da Empresa</label>
          <div className="flex items-center gap-4">
            {currentCompany?.logo_url || logoPreview ? (
              <div className="flex items-center gap-4">
                <img 
                  src={logoPreview || currentCompany?.logo_url} 
                  alt="Preview do logo" 
                  className="h-16 w-16 object-contain border rounded-md"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-8 text-center w-32 h-32 flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload">
                <Button asChild variant="outline">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Escolher Imagem
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Formatos suportados: PNG, JPG, SVG (máx. 2MB)
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="flex justify-end">
        <Button onClick={handleSaveCompany} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// User Management Component - Simplified Version
const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'visualizacao'
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useCompanies();
  const { profile } = useAuth();

  useEffect(() => {
    if (currentCompany) {
      fetchUsers();
      fetchInvitations();
    }
  }, [currentCompany]);

  const fetchUsers = async () => {
    if (!currentCompany) return;
    
    try {
      setLoading(true);
      
      // Fetch users associated with the current company through company_users table
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          user_id,
          profiles (id, nome, perfil, user_id, telefone, cargo)
        `)
        .eq('company_id', currentCompany.id);
      
      if (error) throw error;
      
      // Extract profile data from the join
      const profiles = data
        .map(item => item.profiles)
        .filter(profile => profile !== null);
      
      setUsers(profiles || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message || "Ocorreu um erro ao carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    if (!currentCompany) return;
    
    try {
      // Fetch pending invitations for the company
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      // Don't show error toast for invitations as this is optional
    }
  };

  const handleInviteUser = async () => {
    if (!newUser.email) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o email do usuário.",
        variant: "destructive",
      });
      return;
    }

    if (!currentCompany) {
      toast({
        title: "Erro",
        description: "Nenhuma empresa selecionada.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('Inviting user with params:', {
        user_email: newUser.email,
        company_id: currentCompany.id,
        user_role: newUser.role
      });
      
      // 1. Use our secure database function to invite the user
      const { data: inviteData, error: inviteError } = await supabase
        .rpc('invite_user_to_company', {
          user_email: newUser.email,
          company_id: currentCompany.id,
          user_role: newUser.role
        });
      
      console.log('Invite function result:', { inviteData, inviteError });
      
      if (inviteError) throw inviteError;
      
      if (!inviteData || !inviteData[0] || !inviteData[0].success) {
        throw new Error(inviteData?.[0]?.message || "Erro desconhecido ao convidar usuário");
      }
      
      // 2. Create invitation record in our invitations table
      const { data: invitationData, error: invitationError } = await supabase
        .rpc('create_company_invitation', {
          user_email: newUser.email,
          company_id: currentCompany.id
        });
      
      console.log('Invitation function result:', { invitationData, invitationError });
      
      if (invitationError) throw invitationError;
      
      if (!invitationData || !invitationData[0] || !invitationData[0].success) {
        throw new Error(invitationData?.[0]?.message || "Erro desconhecido ao criar convite");
      }
      
      // Refresh user and invitation lists
      fetchUsers();
      fetchInvitations();
      
      // Reset form
      setNewUser({ email: '', role: 'visualizacao' });
      setIsInvitingUser(false);
      
      toast({
        title: "Usuário convidado",
        description: `Um convite foi registrado para ${newUser.email}.`,
      });
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Erro ao convidar usuário",
        description: error.message || "Ocorreu um erro ao convidar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, profileId: string) => {
    try {
      // Check if user is trying to delete themselves
      if (userId === profile?.user_id) {
        toast({
          title: "Erro",
          description: "Você não pode remover a si mesmo.",
          variant: "destructive",
        });
        return;
      }
      
      // 1. Remove user from company_users table
      const { error: companyUserError } = await supabase
        .from('company_users')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', currentCompany?.id);
      
      if (companyUserError) throw companyUserError;
      
      // Refresh user list
      fetchUsers();
      
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido da empresa com sucesso.",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro ao remover usuário",
        description: error.message || "Ocorreu um erro ao remover o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ perfil: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Refresh user list
      fetchUsers();
      
      toast({
        title: "Função atualizada",
        description: "A função do usuário foi atualizada com sucesso.",
      });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Erro ao atualizar função",
        description: error.message || "Ocorreu um erro ao atualizar a função do usuário.",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      'admin': 'Administrador',
      'financeiro': 'Financeiro',
      'visualizacao': 'Visualização'
    };
    return roles[role] || role;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    } else if (digits.length > 2) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<any>>) => {
    const formatted = formatPhone(e.target.value);
    setter((prev: any) => ({...prev, phone: formatted}));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Gerenciamento de Usuários</h3>
          <p className="text-sm text-muted-foreground">
            Adicione e gerencie usuários da sua empresa
          </p>
        </div>
        
        <Button onClick={() => setIsInvitingUser(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Convidar Usuário
        </Button>
      </div>
      
      <Separator />
      
      {isInvitingUser && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="email@empresa.com"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Função</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="admin">Administrador</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="visualizacao">Visualização</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsInvitingUser(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleInviteUser}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Convidando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-4">
        <h4 className="text-md font-medium">Usuários Ativos ({users.length})</h4>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione usuários para começar a colaborar com sua equipe.
            </p>
            <Button onClick={() => setIsInvitingUser(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Usuário
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 font-medium text-sm text-muted-foreground border-b">
              <div>Nome</div>
              <div>Função</div>
              <div>Telefone</div>
              <div className="md:col-span-2 text-right">Ações</div>
            </div>
            
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b last:border-b-0 hover:bg-muted">
                <div className="font-medium">{user.nome}</div>
                <div>
                  <select
                    value={user.perfil}
                    onChange={(e) => handleUpdateUserRole(user.user_id, e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    disabled={user.user_id === profile?.user_id}
                  >
                    <option value="admin">Administrador</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="visualizacao">Visualização</option>
                  </select>
                </div>
                <div>{user.telefone || '-'}</div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  {user.user_id !== profile?.user_id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteUser(user.user_id, user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {invitations.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium">Convites Pendentes ({invitations.length})</h4>
          
          <div className="border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 font-medium text-sm text-muted-foreground border-b">
              <div>Email</div>
              <div>Convidado Por</div>
              <div>Data do Convite</div>
              <div className="text-right">Ações</div>
            </div>
            
            {invitations.map((invitation) => (
              <div key={invitation.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b last:border-b-0 hover:bg-muted">
                <div className="font-medium">{invitation.email}</div>
                <div>{invitation.invited_by || 'Administrador'}</div>
                <div>{new Date(invitation.created_at).toLocaleDateString('pt-BR')}</div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Reenviar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Notification Settings Component
const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dueDateAlerts, setDueDateAlerts] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(false);
  const [appNotifications, setAppNotifications] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Preferências de Notificação</h3>
        <p className="text-sm text-muted-foreground">
          Escolha como e quando você deseja receber notificações.
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Notificações por Email</p>
            <p className="text-sm text-muted-foreground">
              Receba atualizações importantes por email
            </p>
          </div>
          <Button 
            variant={emailNotifications ? "default" : "outline"} 
            size="sm"
            onClick={() => setEmailNotifications(!emailNotifications)}
          >
            {emailNotifications ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Ativo
              </>
            ) : "Ativar"}
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Alertas de Vencimento</p>
            <p className="text-sm text-muted-foreground">
              Notificações sobre contas a pagar/receber próximas do vencimento
            </p>
          </div>
          <Button 
            variant={dueDateAlerts ? "default" : "outline"} 
            size="sm"
            onClick={() => setDueDateAlerts(!dueDateAlerts)}
          >
            {dueDateAlerts ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Ativo
              </>
            ) : "Ativar"}
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Relatórios Mensais</p>
            <p className="text-sm text-muted-foreground">
              Receba relatórios financeiros mensais
            </p>
          </div>
          <Button 
            variant={monthlyReports ? "default" : "outline"} 
            size="sm"
            onClick={() => setMonthlyReports(!monthlyReports)}
          >
            {monthlyReports ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Ativo
              </>
            ) : "Ativar"}
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Notificações no App</p>
            <p className="text-sm text-muted-foreground">
              Receba notificações dentro do aplicativo
            </p>
          </div>
          <Button 
            variant={appNotifications ? "default" : "outline"} 
            size="sm"
            onClick={() => setAppNotifications(!appNotifications)}
          >
            {appNotifications ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Ativo
              </>
            ) : "Ativar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Appearance Settings Component
const AppearanceSettings = () => {
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('pt-BR');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Aparência</h3>
        <p className="text-sm text-muted-foreground">
          Personalize a aparência do sistema.
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <div>
          <h4 className="text-md font-medium mb-2">Tema</h4>
          <div className="grid grid-cols-3 gap-4">
            <div 
              className={`border rounded-lg p-4 cursor-pointer hover:bg-muted ${theme === 'light' ? 'border-2 border-primary' : ''}`}
              onClick={() => setTheme('light')}
            >
              <div className="bg-white h-20 rounded mb-2 border"></div>
              <p className="text-sm text-center">Claro</p>
            </div>
            <div 
              className={`border rounded-lg p-4 cursor-pointer hover:bg-muted ${theme === 'dark' ? 'border-2 border-primary' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <div className="bg-gray-800 h-20 rounded mb-2"></div>
              <p className="text-sm text-center">Escuro</p>
            </div>
            <div 
              className={`border rounded-lg p-4 cursor-pointer hover:bg-muted ${theme === 'system' ? 'border-2 border-primary' : ''}`}
              onClick={() => setTheme('system')}
            >
              <div className="bg-gradient-to-br from-white to-gray-200 h-20 rounded mb-2 border"></div>
              <p className="text-sm text-center font-medium">Sistema</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="text-md font-medium mb-2">Idioma</h4>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Security Settings Component
const SecuritySettings = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Ocorreu um erro ao atualizar sua senha.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Segurança</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações de segurança da sua conta.
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Alterar Senha</p>
            <p className="text-sm text-muted-foreground">
              Atualize sua senha de acesso
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsChangingPassword(!isChangingPassword)}
          >
            <Key className="mr-2 h-4 w-4" />
            Alterar
          </Button>
        </div>
        
        {isChangingPassword && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsChangingPassword(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleChangePassword}>
                Salvar Nova Senha
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Autenticação de Dois Fatores</p>
            <p className="text-sm text-muted-foreground">
              Adicione uma camada extra de segurança
            </p>
          </div>
          <Button variant="outline" size="sm">Ativar</Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Histórico de Acesso</p>
            <p className="text-sm text-muted-foreground">
              Veja os dispositivos e locais onde você fez login
            </p>
          </div>
          <Button variant="outline" size="sm">Visualizar</Button>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="text-md font-medium mb-2">Sessões Ativas</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Chrome no Windows</p>
                <p className="text-xs text-muted-foreground">Última atividade: hoje às 14:30</p>
              </div>
              <Button variant="outline" size="sm">Encerrar</Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Safari no iPhone</p>
                <p className="text-xs text-muted-foreground">Última atividade: ontem às 18:45</p>
              </div>
              <Button variant="outline" size="sm">Encerrar</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
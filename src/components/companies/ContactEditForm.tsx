import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContacts } from '@/hooks/use-contacts';
import { useCompanies } from '@/hooks/use-companies';

// Address fields
const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  contact_type: z.enum(['cliente', 'fornecedor'], {
    required_error: 'Tipo de contato é obrigatório',
  }),
  document: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: addressSchema.optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactEditFormProps {
  contact: any;
  onSuccess?: () => void;
}

export function ContactEditForm({ contact, onSuccess }: ContactEditFormProps) {
  const { currentCompany } = useCompanies();
  const { updateContact } = useContacts(currentCompany?.id);
  const [loading, setLoading] = useState(false);

  // Parse the existing address string into separate components
  const parseAddress = (addressString: string | null) => {
    if (!addressString) {
      return {
        street: '',
        number: '',
        neighborhood: '',
        complement: '',
        city: '',
        state: '',
        zipCode: '',
      };
    }

    // Simple parsing logic - in a real application you might want more robust parsing
    const parts = addressString.split(', ');
    const result: any = {
      street: '',
      number: '',
      neighborhood: '',
      complement: '',
      city: '',
      state: '',
      zipCode: '',
    };

    // Look for patterns like "Rua, Number" or "Apto" for complement
    for (const part of parts) {
      // Try to identify parts based on common patterns
      if (part.includes('Apto') || part.includes('Bloco') || part.includes('Andar') || part.includes('Fundos')) {
        result.complement = part;
      } else if (/^\d+$/.test(part) || /\d/.test(part)) {
        // Likely number
        if (!result.number) result.number = part;
      } else if (part.length <= 2) {
        // Likely state abbreviation
        result.state = part;
      } else if (part.length === 8 || part.length === 9) {
        // Likely ZIP code
        result.zipCode = part;
      } else if (part.toLowerCase().includes('centro') || part.toLowerCase().includes('bairro') || part.toLowerCase().includes('bairro')) {
        result.neighborhood = part;
      } else if (part.toLowerCase().includes('são paulo') || part.toLowerCase().includes('rio de janeiro') || part.toLowerCase().includes('brasília')) {
        result.city = part;
      } else if (!result.street) {
        result.street = part;
      } else if (!result.neighborhood) {
        result.neighborhood = part;
      } else if (!result.city) {
        result.city = part;
      } else if (!result.state) {
        result.state = part;
      }
    }

    return result;
  };

  const parsedAddress = parseAddress(contact.address);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact.name,
      contact_type: contact.contact_type,
      document: contact.document || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: parsedAddress,
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      // Combine address fields into a single string
      const addressParts = [];
      if (data.address?.street) addressParts.push(data.address.street);
      if (data.address?.number) addressParts.push(data.address.number);
      if (data.address?.neighborhood) addressParts.push(data.address.neighborhood);
      if (data.address?.complement) addressParts.push(data.address.complement);
      if (data.address?.city) addressParts.push(data.address.city);
      if (data.address?.state) addressParts.push(data.address.state);
      if (data.address?.zipCode) addressParts.push(data.address.zipCode);
      
      const combinedAddress = addressParts.join(', ');

      const updateData = {
        name: data.name,
        contact_type: data.contact_type,
        document: data.document || null,
        email: data.email || null,
        phone: data.phone || null,
        address: combinedAddress || null,
      };

      const result = await updateContact(contact.id, updateData);
      if (result && !result.error) {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error updating contact:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: João Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Contato *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF/CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contato@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input placeholder="(11) 99999-9999" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rua</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Rua das Flores" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address.number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address.neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Centro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address.complement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Apto 45" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: São Paulo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address.state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: SP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="address.zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 01001-000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>
    </Form>
  );
}
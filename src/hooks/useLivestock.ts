import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LivestockAnimal {
  id: string;
  owner_id: string;
  animal_id: string;
  tag_id: string | null;
  name: string | null;
  species: string;
  breed: string | null;
  sex: string | null;
  birth_date: string | null;
  acquisition_date: string | null;
  acquisition_method: string;
  status: string;
  color_markings: string | null;
  photo_url: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LivestockWeight {
  id: string;
  animal_id: string;
  weight_lbs: number;
  recorded_by: string;
  recorded_at: string;
  notes: string | null;
}

export interface LivestockHealthRecord {
  id: string;
  animal_id: string;
  record_type: string;
  title: string;
  description: string | null;
  medication: string | null;
  dosage: string | null;
  vet_name: string | null;
  follow_up_date: string | null;
  cost: number | null;
  recorded_at: string;
}

export interface LivestockNote {
  id: string;
  animal_id: string;
  author_id: string;
  content: string;
  note_type: string;
  created_at: string;
}

export interface LivestockTag {
  id: string;
  animal_id: string;
  tag_type: string;
  tag_number: string;
  tag_location: string | null;
  is_primary: boolean;
}

export interface LivestockAccessPermissions {
  view_records?: boolean;
  add_notes?: boolean;
  add_weights?: boolean;
  add_health?: boolean;
  manage_tags?: boolean;
  grantee_email?: string;
  [key: string]: any;
}

export interface LivestockAccessGrant {
  id: string;
  owner_id: string;
  granted_to: string;
  role: string;
  animal_ids: string[] | null;
  permissions: LivestockAccessPermissions;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

function generateAnimalId(species: string): string {
  const prefix = species.substring(0, 3).toUpperCase();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${num}`;
}

// Use type assertion helper since tables may not be in generated types yet
const db = supabase as any;

export function useLivestock() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<LivestockAnimal | null>(null);
  const [weights, setWeights] = useState<LivestockWeight[]>([]);
  const [healthRecords, setHealthRecords] = useState<LivestockHealthRecord[]>([]);
  const [notes, setNotes] = useState<LivestockNote[]>([]);
  const [tags, setTags] = useState<LivestockTag[]>([]);
  const [sharedAccess, setSharedAccess] = useState<LivestockAccessGrant[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  const fetchAnimals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('livestock_animals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAnimals(data || []);
    } catch (err: any) {
      console.error('Error fetching animals:', err);
      setAnimals([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  const addAnimal = async (data: {
    name?: string;
    species: string;
    breed?: string;
    sex?: string;
    birth_date?: string;
    color_markings?: string;
    notes?: string;
    acquisition_method?: string;
    tag_id?: string;
  }) => {
    if (!user) return null;
    try {
      const animal_id = generateAnimalId(data.species);
      const insertData: any = {
        owner_id: user.id,
        animal_id,
        name: data.name || null,
        species: data.species,
        breed: data.breed || null,
        sex: data.sex || null,
        birth_date: data.birth_date || null,
        color_markings: data.color_markings || null,
        notes: data.notes || null,
        acquisition_method: data.acquisition_method || 'born_on_farm',
      };
      if (data.tag_id) insertData.tag_id = data.tag_id;

      const { data: newAnimal, error } = await db
        .from('livestock_animals')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;

      // If this tag came from the pool, mark it assigned
      if (data.tag_id && newAnimal) {
        await db
          .from('livestock_tag_pool')
          .update({ status: 'assigned', assigned_to_animal: newAnimal.id, assigned_by: user.id, assigned_at: new Date().toISOString() })
          .eq('tag_id', data.tag_id);
      }

      toast.success(`${data.name || animal_id} added to your herd! 🐮`);
      await fetchAnimals();
      return newAnimal;
    } catch (err: any) {
      console.error('Error adding animal:', err);
      toast.error('Failed to add animal. Make sure the database tables are set up.');
      return null;
    }
  };

  const addWeight = async (animalId: string, weightLbs: number, weightNotes?: string) => {
    if (!user) return;
    try {
      const { error } = await db
        .from('livestock_weights')
        .insert({
          animal_id: animalId,
          weight_lbs: weightLbs,
          recorded_by: user.id,
          notes: weightNotes || null,
        });
      
      if (error) throw error;
      toast.success('Weight recorded! 📊');
      if (selectedAnimal?.id === animalId) await fetchAnimalDetails(animalId);
    } catch (err: any) {
      console.error('Error adding weight:', err);
      toast.error('Failed to record weight');
    }
  };

  const addHealthRecord = async (animalId: string, record: {
    record_type: string;
    title: string;
    description?: string;
    medication?: string;
    dosage?: string;
    vet_name?: string;
    follow_up_date?: string;
    cost?: number;
  }) => {
    if (!user) return;
    try {
      const { error } = await db
        .from('livestock_health_records')
        .insert({
          animal_id: animalId,
          administered_by: user.id,
          ...record,
        });
      
      if (error) throw error;
      toast.success('Health record saved! 💊');
      if (selectedAnimal?.id === animalId) await fetchAnimalDetails(animalId);
    } catch (err: any) {
      console.error('Error adding health record:', err);
      toast.error('Failed to save health record');
    }
  };

  const addNote = async (animalId: string, content: string, noteType: string = 'general') => {
    if (!user) return;
    try {
      const { error } = await db
        .from('livestock_notes')
        .insert({
          animal_id: animalId,
          author_id: user.id,
          content,
          note_type: noteType,
        });
      
      if (error) throw error;
      toast.success('Note added! 📝');
      if (selectedAnimal?.id === animalId) await fetchAnimalDetails(animalId);
    } catch (err: any) {
      console.error('Error adding note:', err);
      toast.error('Failed to add note');
    }
  };

  const addTag = async (animalId: string, tagNumber: string, tagType: string = 'visual', tagLocation?: string) => {
    if (!user) return;
    try {
      const { error } = await db
        .from('livestock_tags')
        .insert({
          animal_id: animalId,
          tag_number: tagNumber,
          tag_type: tagType,
          tag_location: tagLocation || null,
          is_primary: tags.length === 0,
        });
      
      if (error) throw error;
      toast.success('Tag linked! 🏷️');
      if (selectedAnimal?.id === animalId) await fetchAnimalDetails(animalId);
    } catch (err: any) {
      console.error('Error adding tag:', err);
      toast.error('Failed to link tag');
    }
  };

  const fetchAnimalDetails = async (animalId: string) => {
    if (!user) return;

    try {
      setAccessLoading(true);

      const [weightsRes, healthRes, notesRes, tagsRes, accessRes] = await Promise.all([
        db.from('livestock_weights').select('*').eq('animal_id', animalId).order('recorded_at', { ascending: false }),
        db.from('livestock_health_records').select('*').eq('animal_id', animalId).order('recorded_at', { ascending: false }),
        db.from('livestock_notes').select('*').eq('animal_id', animalId).order('created_at', { ascending: false }),
        db.from('livestock_tags').select('*').eq('animal_id', animalId),
        db
          .from('livestock_access')
          .select('*')
          .eq('owner_id', user.id)
          .is('revoked_at', null)
          .order('granted_at', { ascending: false }),
      ]);

      setWeights(weightsRes.data || []);
      setHealthRecords(healthRes.data || []);
      setNotes(notesRes.data || []);
      setTags(tagsRes.data || []);

      const activeAccess = (accessRes.data || []).filter((entry: LivestockAccessGrant) => {
        if (!entry.animal_ids || entry.animal_ids.length === 0) return true;
        return entry.animal_ids.includes(animalId);
      });
      setSharedAccess(activeAccess);
    } catch (err) {
      console.error('Error fetching animal details:', err);
      setSharedAccess([]);
    } finally {
      setAccessLoading(false);
    }
  };

  const selectAnimal = async (animal: LivestockAnimal) => {
    setSelectedAnimal(animal);
    await fetchAnimalDetails(animal.id);
  };

  const lookupByTag = async (tagNumber: string): Promise<LivestockAnimal | null> => {
    try {
      const { data: tagData, error: tagError } = await db
        .from('livestock_tags')
        .select('animal_id')
        .eq('tag_number', tagNumber)
        .single();
      
      if (tagError || !tagData) {
        toast.error('No animal found with that tag');
        return null;
      }

      const { data: animal, error } = await db
        .from('livestock_animals')
        .select('*')
        .eq('id', tagData.animal_id)
        .single();
      
      if (error || !animal) {
        toast.error('Animal record not found');
        return null;
      }

      await selectAnimal(animal);
      return animal;
    } catch (err) {
      console.error('Tag lookup error:', err);
      toast.error('Tag scan failed');
      return null;
    }
  };

  // Scan via edge function — looks up by tag_id on livestock_animals
  const scanCard = async (tagId: string) => {
    if (!user) return null;
    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('scan-card', {
        body: { tag_id: tagId },
      });

      if (invokeError) {
        // Try to extract a meaningful message from the response
        const errMsg = result?.error || invokeError.message || 'Scan failed';
        toast.error(errMsg);
        return { error: errMsg, status: 500 };
      }

      // Handle unregistered pool tag
      if (result?.status === 'unregistered') {
        toast.info('Tag recognized! Ready to register a new animal.');
        return result;
      }

      if (result?.error) {
        toast.error(result.error);
        return { error: result.error };
      }

      if (result.animal) {
        setSelectedAnimal(result.animal);
        setWeights(result.weights || []);
        setHealthRecords(result.health_records || []);
        setNotes(result.notes || []);
        setTags(result.tags || []);
        setSharedAccess([]);
      }

      toast.success('Tag scanned successfully! 📡');
      return result;
    } catch (err: any) {
      console.error('Tag scan error:', err);
      toast.error('Tag scan failed');
      return null;
    }
  };

  // Delete an animal and all related records
  const deleteAnimal = async (animalId: string) => {
    if (!user) return;
    try {
      const { data: animalToDelete, error: animalLookupError } = await db
        .from('livestock_animals')
        .select('tag_id')
        .eq('id', animalId)
        .single();

      if (animalLookupError) throw animalLookupError;

      // Delete related records first
      const cleanupResults = await Promise.all([
        db.from('livestock_weights').delete().eq('animal_id', animalId),
        db.from('livestock_health_records').delete().eq('animal_id', animalId),
        db.from('livestock_notes').delete().eq('animal_id', animalId),
        db.from('livestock_tags').delete().eq('animal_id', animalId),
        db.from('livestock_scan_logs').delete().eq('animal_id', animalId),
      ]);

      const cleanupError = cleanupResults.find((result: any) => result?.error)?.error;
      if (cleanupError) throw cleanupError;
      
      const { error } = await db.from('livestock_animals').delete().eq('id', animalId);
      if (error) throw error;

      // Fallback reset in app layer (DB trigger also handles this).
      if (animalToDelete?.tag_id) {
        const { error: poolResetError } = await db
          .from('livestock_tag_pool')
          .update({
            status: 'available',
            assigned_to_animal: null,
            assigned_by: null,
            assigned_at: null,
          })
          .eq('tag_id', animalToDelete.tag_id);

        if (poolResetError) {
          console.warn('Pool reset fallback failed:', poolResetError);
        }
      }
      
      setAnimals(prev => prev.filter(a => a.id !== animalId));
      setSelectedAnimal(null);
      setSharedAccess([]);
      toast.success('Animal deleted successfully');
    } catch (err: any) {
      console.error('Delete animal error:', err);
      toast.error('Failed to delete animal');
    }
  };

  const grantAccessToAnimal = async (
    animalId: string,
    email: string,
    role: string = 'farm_worker',
    permissions: LivestockAccessPermissions = {
      view_records: true,
      add_notes: true,
      add_weights: true,
      add_health: true,
      manage_tags: false,
    }
  ) => {
    if (!user) return false;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Please enter an email address');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-livestock-access', {
        body: {
          action: 'grant',
          animal_id: animalId,
          email: normalizedEmail,
          role,
          permissions,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      toast.success(`Access granted to ${normalizedEmail}`);

      if (selectedAnimal?.id === animalId) {
        await fetchAnimalDetails(animalId);
      }

      return true;
    } catch (err: any) {
      console.error('Grant access error:', err);
      toast.error(err.message || 'Failed to grant access');
      return false;
    }
  };

  const revokeAccess = async (accessId: string, animalId: string) => {
    if (!user) return;

    try {
      const { error } = await db
        .from('livestock_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', accessId)
        .eq('owner_id', user.id);

      if (error) throw error;

      toast.success('Access revoked');

      if (selectedAnimal?.id === animalId) {
        await fetchAnimalDetails(animalId);
      }
    } catch (err: any) {
      console.error('Revoke access error:', err);
      toast.error('Failed to revoke access');
    }
  };

  // Get scan history
  const getScanHistory = async (animalId?: string) => {
    try {
      let query = db.from('livestock_scan_logs').select('*').order('scanned_at', { ascending: false }).limit(50);
      if (animalId) query = query.eq('animal_id', animalId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Get scan history error:', err);
      return [];
    }
  };

  return {
    animals, loading, selectedAnimal, weights, healthRecords, notes, tags, sharedAccess, accessLoading,
    addAnimal, addWeight, addHealthRecord, addNote, addTag, deleteAnimal,
    selectAnimal, lookupByTag, fetchAnimals, setSelectedAnimal,
    scanCard, getScanHistory, grantAccessToAnimal, revokeAccess,
  };
}

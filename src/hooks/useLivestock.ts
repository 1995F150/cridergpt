import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LivestockAnimal {
  id: string;
  owner_id: string;
  animal_id: string;
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
  }) => {
    if (!user) return null;
    try {
      const animal_id = generateAnimalId(data.species);
      const { data: newAnimal, error } = await db
        .from('livestock_animals')
        .insert({
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
        })
        .select()
        .single();
      
      if (error) throw error;
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
    try {
      const [weightsRes, healthRes, notesRes, tagsRes] = await Promise.all([
        db.from('livestock_weights').select('*').eq('animal_id', animalId).order('recorded_at', { ascending: false }),
        db.from('livestock_health_records').select('*').eq('animal_id', animalId).order('recorded_at', { ascending: false }),
        db.from('livestock_notes').select('*').eq('animal_id', animalId).order('created_at', { ascending: false }),
        db.from('livestock_tags').select('*').eq('animal_id', animalId),
      ]);

      setWeights(weightsRes.data || []);
      setHealthRecords(healthRes.data || []);
      setNotes(notesRes.data || []);
      setTags(tagsRes.data || []);
    } catch (err) {
      console.error('Error fetching animal details:', err);
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

  return {
    animals, loading, selectedAnimal, weights, healthRecords, notes, tags,
    addAnimal, addWeight, addHealthRecord, addNote, addTag,
    selectAnimal, lookupByTag, fetchAnimals, setSelectedAnimal,
  };
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Database, FileText, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TrainingDataset {
  id: string;
  dataset_name: string;
  description: string;
  category: 'agriculture' | 'mechanics' | 'electrical' | 'welding' | 'ffa' | 'general' | 'personal';
  data_type: 'text' | 'qa_pairs' | 'manual' | 'reference' | 'life_story';
  status: 'pending' | 'processing' | 'active' | 'error';
  created_at: string;
  content?: string;
  metadata?: any;
}

export function TrainingDataManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<TrainingDataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadData, setUploadData] = useState({
    dataset_name: '',
    description: '',
    category: 'general' as const,
    data_type: 'text' as const,
    content: ''
  });

  const loadDatasets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cridergpt_training_data')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setDatasets(data?.map(item => ({
        id: item.id,
        dataset_name: item.dataset_name,
        description: item.description || '',
        category: item.category as any,
        data_type: item.data_type as any,
        status: item.status as any,
        created_at: item.created_at,
        content: item.content,
        metadata: item.metadata
      })) || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load training datasets",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadDatasets();
  }, [user]);

  const addLifeStory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('add-training-data', {
        body: {}
      });

      if (error) throw error;

      await loadDatasets();
      
      toast({
        title: "Life Story Added",
        description: "Jessie's life story has been added to CriderGPT training data"
      });
    } catch (error) {
      console.error('Error adding life story:', error);
      toast({
        title: "Error",
        description: "Failed to add life story",
        variant: "destructive"
      });
    }
  };

  const saveDataset = async () => {
    if (!uploadData.dataset_name.trim() || !uploadData.content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide dataset name and content",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('cridergpt_training_data')
        .insert({
          dataset_name: uploadData.dataset_name,
          description: uploadData.description,
          category: uploadData.category,
          data_type: uploadData.data_type,
          content: uploadData.content,
          status: 'active'
        });

      if (error) throw error;

      await loadDatasets();

      setUploadData({
        dataset_name: '',
        description: '',
        category: 'general',
        data_type: 'text',
        content: ''
      });

      toast({
        title: "Training Data Added",
        description: "CriderGPT training dataset has been uploaded successfully"
      });
    } catch (error) {
      console.error('Error saving dataset:', error);
      toast({
        title: "Error Saving Data",
        description: "Failed to save training dataset",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'agriculture': return 'bg-green-500/10 text-green-500';
      case 'mechanics': return 'bg-blue-500/10 text-blue-500';
      case 'electrical': return 'bg-yellow-500/10 text-yellow-500';
      case 'welding': return 'bg-red-500/10 text-red-500';
      case 'ffa': return 'bg-purple-500/10 text-purple-500';
      case 'general': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="h-4 w-4" />;
      case 'qa_pairs': return <Brain className="h-4 w-4" />;
      case 'manual': return <Database className="h-4 w-4" />;
      case 'reference': return <Upload className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CriderGPT Training Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Owner Access Only</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This section is for uploading training data to improve CriderGPT's knowledge base. 
              Add manuals, Q&A pairs, and technical documentation here.
            </p>
            <div className="mt-3">
              <Button onClick={addLifeStory} variant="outline" size="sm">
                Add Founder Life Story
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Dataset Name</label>
                <Input
                  placeholder="e.g., John Deere Service Manual 2024"
                  value={uploadData.dataset_name}
                  onChange={(e) => setUploadData(prev => ({ ...prev, dataset_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="agriculture">Agriculture</option>
                  <option value="mechanics">Mechanics</option>
                  <option value="electrical">Electrical</option>
                  <option value="welding">Welding</option>
                  <option value="ffa">FFA/Education</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Brief description of this training data"
                value={uploadData.description}
                onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Data Type</label>
              <select
                value={uploadData.data_type}
                onChange={(e) => setUploadData(prev => ({ ...prev, data_type: e.target.value as any }))}
                className="mt-1 w-full px-3 py-2 border rounded-md"
              >
                <option value="text">Text/Manual</option>
                <option value="qa_pairs">Q&A Pairs</option>
                <option value="manual">Technical Manual</option>
                <option value="reference">Reference Material</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Training Content</label>
              <Textarea
                placeholder="Paste your training data here... (manuals, Q&A pairs, technical documentation, etc.)"
                value={uploadData.content}
                onChange={(e) => setUploadData(prev => ({ ...prev, content: e.target.value }))}
                className="mt-1 min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Characters: {uploadData.content.length}
              </p>
            </div>

            <Button onClick={saveDataset} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Training Dataset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CriderGPT Training Datasets ({datasets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {datasets.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No training datasets uploaded yet. Add some data above to improve CriderGPT's knowledge.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {datasets.map((dataset) => (
                <div key={dataset.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(dataset.data_type)}
                      <h3 className="font-semibold">{dataset.dataset_name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getCategoryColor(dataset.category)}>
                        {dataset.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {dataset.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {dataset.description && (
                    <p className="text-sm text-muted-foreground mb-2">{dataset.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Type: {dataset.data_type.replace('_', ' ')}</span>
                    <span>Size: {dataset.content ? `${dataset.content.length} characters` : 'Unknown'}</span>
                    <span>Added: {new Date(dataset.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus,
  Image,
  Video,
  Camera,
  Eye,
  X,
  Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Story {
  id: string;
  user_id: string;
  content: string;
  media_url?: string;
  media_type: string;
  views_count: number;
  created_at: string;
  expires_at: string;
  user?: {
    display_name: string;
    avatar_url?: string;
    email: string;
  };
}

interface StoryManagerProps {
  friends: Array<{ friend?: { id: string; display_name: string; email: string; avatar_url?: string } }>;
}

export const StoryManager: React.FC<StoryManagerProps> = ({ friends }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [stories, setStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryMediaType, setNewStoryMediaType] = useState('text');
  const [loading, setLoading] = useState(false);

  // Load stories from friends and self
  const loadStories = async () => {
    if (!user) return;

    try {
      // Get stories from friends and self
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (storiesData) {
        const formattedStories = await Promise.all(
          storiesData.map(async (story) => {
            const { data: userData } = await supabase
              .from('crider_chat_users')
              .select('user_id, display_name, email, avatar_url')
              .eq('user_id', story.user_id)
              .single();

            return {
              ...story,
              user: userData ? {
                display_name: userData.display_name,
                email: userData.email,
                avatar_url: userData.avatar_url
              } : null
            };
          })
        );

        // Separate my stories from others, filter out stories without user data
        const validStories = formattedStories.filter(story => story.user);
        const myStoriesFiltered = validStories.filter(story => story.user_id === user.id);
        const friendStoriesFiltered = validStories.filter(story => story.user_id !== user.id);

        setMyStories(myStoriesFiltered);
        setStories(friendStoriesFiltered);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      toast({
        title: "Error",
        description: "Failed to load stories",
        variant: "destructive"
      });
    }
  };

  // Create new story
  const createStory = async () => {
    if (!user || !newStoryContent.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          content: newStoryContent,
          media_type: newStoryMediaType
        });

      if (error) throw error;

      toast({
        title: "Story posted!",
        description: "Your story has been shared with friends."
      });

      setNewStoryContent('');
      setShowCreateStory(false);
      loadStories();
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        title: "Error",
        description: "Failed to create story",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // View story (increment view count)
  const viewStory = async (storyId: string, userId: string) => {
    if (!user || userId === user.id) return; // Don't count views on own stories

    try {
      // Insert view record (will trigger view count increment)
      await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: user.id
        });

      // Reload stories to update view count
      loadStories();
    } catch (error) {
      // Ignore duplicate view errors
      console.log('View already recorded or error:', error);
    }
  };

  // Delete story
  const deleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .update({ is_active: false })
        .eq('id', storyId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Story deleted",
        description: "Your story has been removed."
      });

      loadStories();
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: "Error",
        description: "Failed to delete story",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadStories();
    }
  }, [user]);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const storyDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - storyDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return '24h ago';
  };

  return (
    <div className="space-y-4">
      {/* Create Story Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Stories
            <Button 
              size="sm" 
              onClick={() => setShowCreateStory(!showCreateStory)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Story
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showCreateStory && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex gap-2">
                <Button
                  variant={newStoryMediaType === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewStoryMediaType('text')}
                >
                  Text
                </Button>
                <Button
                  variant={newStoryMediaType === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewStoryMediaType('image')}
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  variant={newStoryMediaType === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewStoryMediaType('video')}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="What's on your mind? Share a story that expires in 24 hours..."
                value={newStoryContent}
                onChange={(e) => setNewStoryContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={createStory} disabled={loading || !newStoryContent.trim()}>
                  {loading ? 'Posting...' : 'Post Story'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateStory(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* My Stories */}
          {myStories.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Your Stories</h4>
              <div className="grid gap-2">
                {myStories.map((story) => (
                  <div key={story.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm">{story.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          {story.views_count}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(story.created_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStory(story.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friends' Stories */}
      <Card>
        <CardHeader>
          <CardTitle>Friends' Stories</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            {stories.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No stories to show. Add friends to see their stories!
              </p>
            ) : (
              <div className="space-y-4">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => viewStory(story.id, story.user_id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={story.user?.avatar_url} />
                        <AvatarFallback>
                          {story.user?.display_name?.[0] || story.user?.email?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-sm">
                            {story.user?.display_name || story.user?.email}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(story.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{story.content}</p>
                        {story.media_type !== 'text' && (
                          <Badge variant="outline" className="mt-2">
                            {story.media_type === 'image' ? <Image className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
                            {story.media_type}
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            {story.views_count} views
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
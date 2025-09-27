import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, MapPin, Zap, Users, ExternalLink, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureNotifications } from "@/hooks/useFeatureNotifications";
import { useToast } from "@/hooks/use-toast";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

interface Notification {
  id: string;
  type: 'announcement' | 'feature' | 'update' | 'promotion';
  title: string;
  message: string;
  icon?: any;
  gradient?: string;
  actionLabel?: string;
  onAction?: () => void;
  priority?: 'low' | 'normal' | 'high';
}

export function FeatureNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { getUpcomingEvents } = useCalendarEvents();
  
  // Subscribe to real-time notifications
  useFeatureNotifications();

  useEffect(() => {
    // Get upcoming calendar events and convert to notifications
    const upcomingEvents = getUpcomingEvents();
    const eventNotifications: Notification[] = upcomingEvents.map(event => ({
      id: `event-${event.id}`,
      type: 'announcement' as const,
      title: `Upcoming: ${event.title}`,
      message: `${event.category} event starting soon at ${new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      icon: CalendarIcon,
      gradient: `bg-gradient-to-r ${
        event.category === 'FFA' ? 'from-green-500 to-emerald-600' :
        event.category === 'School' ? 'from-blue-500 to-cyan-600' :
        event.category === 'Business' ? 'from-purple-500 to-violet-600' :
        'from-pink-500 to-rose-600'
      }`,
      priority: 'high' as const,
    }));

    // Static notifications for all users
    const staticNotifications: Notification[] = [
      {
        id: 'map-builder-announcement',
        type: 'announcement',
        title: 'CriderGPT Map Builder Available Now! 🗺️',
        message: 'Revolutionary AI-powered mapping platform with smart location intelligence, real-time updates, and collaborative features.',
        icon: MapPin,
        gradient: 'bg-gradient-to-r from-green-500 to-emerald-600',
        actionLabel: 'Launch Map Builder',
        onAction: () => {
          window.open('https://cridergpt-map-builder.lovable.app/', '_blank');
          setDismissedNotifications(prev => new Set(prev).add('map-builder-announcement'));
        },
        priority: 'high'
      },
      {
        id: 'ai-improvements',
        type: 'update',
        title: 'AI Response Quality Enhanced 🚀',
        message: 'Our latest AI model updates bring 40% faster responses and improved accuracy across all CriderGPT features.',
        icon: Zap,
        gradient: 'bg-gradient-to-r from-blue-500 to-purple-600',
        actionLabel: 'Try It Now',
        onAction: () => setDismissedNotifications(prev => new Set(prev).add('ai-improvements')),
        priority: 'normal'
      },
      {
        id: 'community-milestone',
        type: 'announcement',
        title: '10,000+ Users Strong! 🎉',
        message: 'Thank you for being part of our growing CriderGPT community. Your feedback drives our innovation.',
        icon: Users,
        gradient: 'bg-gradient-to-r from-pink-500 to-rose-600',
        actionLabel: 'Share Feedback',
        onAction: () => {
          window.open('mailto:jessiecrider3@gmail.com?subject=CriderGPT Feedback', '_blank');
          setDismissedNotifications(prev => new Set(prev).add('community-milestone'));
        },
        priority: 'normal'
      }
    ];

    // Combine event notifications with static notifications
    setNotifications([...eventNotifications, ...staticNotifications]);

    // Load dismissed notifications from localStorage
    const dismissed = localStorage.getItem('dismissed-notifications');
    if (dismissed) {
      setDismissedNotifications(new Set(JSON.parse(dismissed)));
    }
  }, [toast]);

  // Save dismissed notifications to localStorage
  useEffect(() => {
    localStorage.setItem('dismissed-notifications', JSON.stringify(Array.from(dismissedNotifications)));
  }, [dismissedNotifications]);

  const handleDismiss = (notificationId: string) => {
    setDismissedNotifications(prev => new Set(prev).add(notificationId));
  };

  const getNotificationIcon = (notification: Notification) => {
    const Icon = notification.icon || Sparkles;
    return <Icon className="h-5 w-5 text-white" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 dark:border-red-800';
      case 'normal': return 'border-blue-200 dark:border-blue-800';
      case 'low': return 'border-gray-200 dark:border-gray-800';
      default: return 'border-blue-200 dark:border-blue-800';
    }
  };

  // Filter out dismissed notifications and sort by priority
  const activeNotifications = notifications
    .filter(n => !dismissedNotifications.has(n.id))
    .sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return (priorityOrder[b.priority || 'normal'] || 2) - (priorityOrder[a.priority || 'normal'] || 2);
    });

  if (!user || activeNotifications.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4">
      <div className="max-w-4xl mx-auto space-y-2">
        {activeNotifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`border-2 ${getPriorityColor(notification.priority || 'normal')} shadow-lg animate-slide-down bg-card/95 backdrop-blur-sm`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${notification.gradient || 'bg-gradient-to-r from-blue-500 to-purple-600'} flex-shrink-0`}>
                  {getNotificationIcon(notification)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{notification.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            notification.priority === 'high' ? 'border-red-300 text-red-700' :
                            notification.priority === 'normal' ? 'border-blue-300 text-blue-700' :
                            'border-gray-300 text-gray-700'
                          }`}
                        >
                          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                      
                      <div className="flex items-center gap-2">
                        {notification.actionLabel && notification.onAction && (
                          <Button 
                            size="sm" 
                            onClick={notification.onAction}
                            className="h-8 px-3 text-xs"
                          >
                            {notification.id === 'map-builder-announcement' && <ExternalLink className="h-3 w-3 mr-1" />}
                            {notification.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(notification.id)}
                      className="h-8 w-8 p-0 hover:bg-muted/50 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Dismiss notification</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

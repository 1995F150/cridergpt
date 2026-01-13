import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingTask {
  id: string;
  user_id: string;
  task_description: string;
  detected_from: string | null;
  status: "pending" | "reminded" | "completed" | "dismissed";
  created_at: string;
  remind_after: string | null;
}

// Patterns that indicate unfinished tasks
const TASK_DETECTION_PATTERNS = [
  { pattern: /i'll do (that|it|this) later/i, extract: (msg: string) => msg },
  { pattern: /remind me to (.+)/i, extract: (msg: string) => msg.match(/remind me to (.+)/i)?.[1] || msg },
  { pattern: /need to (finish|complete|do) (.+)/i, extract: (msg: string) => msg.match(/need to (finish|complete|do) (.+)/i)?.[2] || msg },
  { pattern: /later i('ll| will) (.+)/i, extract: (msg: string) => msg.match(/later i('ll| will) (.+)/i)?.[2] || msg },
  { pattern: /todo:? (.+)/i, extract: (msg: string) => msg.match(/todo:? (.+)/i)?.[1] || msg },
  { pattern: /don't forget to (.+)/i, extract: (msg: string) => msg.match(/don't forget to (.+)/i)?.[1] || msg },
  { pattern: /gotta (.+) soon/i, extract: (msg: string) => msg.match(/gotta (.+) soon/i)?.[1] || msg },
];

export function usePendingTasks() {
  const { user } = useAuth();
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Detect if a message contains a task
  const detectTask = useCallback((message: string): { isTask: boolean; taskDescription: string | null } => {
    for (const { pattern, extract } of TASK_DETECTION_PATTERNS) {
      if (pattern.test(message)) {
        return {
          isTask: true,
          taskDescription: extract(message).substring(0, 200),
        };
      }
    }
    return { isTask: false, taskDescription: null };
  }, []);

  // Store a new pending task
  const createTask = useCallback(async (
    taskDescription: string,
    detectedFrom: string,
    remindAfter?: Date
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("pending_tasks")
        .insert({
          user_id: user.id,
          task_description: taskDescription,
          detected_from: detectedFrom,
          status: "pending",
          remind_after: remindAfter?.toISOString() || null,
        });

      if (error) throw error;
      await fetchPendingTasks();
      return true;
    } catch (error) {
      console.error("Error creating task:", error);
      return false;
    }
  }, [user]);

  // Analyze message and auto-create task if detected
  const analyzeAndCreateTask = useCallback(async (
    message: string,
    context: string
  ): Promise<boolean> => {
    const { isTask, taskDescription } = detectTask(message);
    
    if (isTask && taskDescription) {
      return await createTask(taskDescription, context);
    }
    
    return false;
  }, [detectTask, createTask]);

  // Fetch all pending tasks
  const fetchPendingTasks = useCallback(async (): Promise<PendingTask[]> => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_tasks")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "reminded"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingTasks((data || []) as PendingTask[]);
      return (data || []) as PendingTask[];
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update task status
  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: "pending" | "reminded" | "completed" | "dismissed"
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("pending_tasks")
        .update({ status })
        .eq("id", taskId)
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchPendingTasks();
      return true;
    } catch (error) {
      console.error("Error updating task:", error);
      return false;
    }
  }, [user, fetchPendingTasks]);

  // Complete a task
  const completeTask = useCallback(async (taskId: string): Promise<boolean> => {
    return updateTaskStatus(taskId, "completed");
  }, [updateTaskStatus]);

  // Dismiss a task
  const dismissTask = useCallback(async (taskId: string): Promise<boolean> => {
    return updateTaskStatus(taskId, "dismissed");
  }, [updateTaskStatus]);

  // Mark task as reminded
  const markAsReminded = useCallback(async (taskId: string): Promise<boolean> => {
    return updateTaskStatus(taskId, "reminded");
  }, [updateTaskStatus]);

  // Get tasks that are due for reminder
  const getDueTasks = useCallback((): PendingTask[] => {
    const now = new Date();
    return pendingTasks.filter(task => {
      if (task.status !== "pending") return false;
      if (!task.remind_after) return true; // No reminder time set, always due
      return new Date(task.remind_after) <= now;
    });
  }, [pendingTasks]);

  // Delete all completed/dismissed tasks
  const cleanupTasks = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("pending_tasks")
        .delete()
        .eq("user_id", user.id)
        .in("status", ["completed", "dismissed"]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error cleaning up tasks:", error);
      return false;
    }
  }, [user]);

  // Fetch tasks on mount
  useEffect(() => {
    if (user) {
      fetchPendingTasks();
    }
  }, [user]);

  return {
    pendingTasks,
    isLoading,
    detectTask,
    createTask,
    analyzeAndCreateTask,
    fetchPendingTasks,
    completeTask,
    dismissTask,
    markAsReminded,
    getDueTasks,
    cleanupTasks,
  };
}

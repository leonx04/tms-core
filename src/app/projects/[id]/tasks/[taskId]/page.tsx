"use client";

import type React from "react";

import { CommitLink } from "@/components/github/commit-preview";
import { AssigneeGroup } from "@/components/ui/assignee-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { database } from "@/config/firebase";
import { formatTextWithLinks } from "@/config/format-text-with-links";
import { useAuth } from "@/contexts/auth-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import type { Comment, User as FirebaseUser, Task, TaskHistory } from "@/types";
import { TASK_PRIORITY, TASK_TYPE } from "@/types";
import {
  formatDate,
  formatDateTime,
  getPriorityColor,
  getStatusColor,
  getStatusLabel,
  getTypeColor,
  TASK_STATUS,
} from "@/utils/utils";
import {
  equalTo,
  get,
  orderByChild,
  push,
  query,
  ref,
  set,
  update,
} from "firebase/database";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit,
  GitCommit,
  MessageSquare,
  Plus,
  Save,
  User,
  ImageIcon,
  Loader2,
  FileText,
  ExternalLink,
  Download,
  RefreshCw,
  Info,
  Check,
  Filter,
  X,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { MediaUploader } from "@/components/cloudinary/media-uploader";
import { CommentMediaUploader } from "@/components/comment/comment-media-uploader";
import { getCloudinaryConfigByProjectId } from "@/services/cloudinary-service";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskMediaSection } from "@/components/cloudinary/task-media-section";

// Custom utility class for extra small screens (below 480px)
const xsScreenClass = "max-[480px]:";

// Extract commit ID from input string.
// If input contains a commit URL, extract the ID. Otherwise, check if the input is a valid commit ID (7-40 hex chars).
const extractCommitId = (input: string): string => {
  if (!input) return "";
  const trimmed = input.trim();
  const urlRegex = /commit\/([a-f0-9]{7,40})/i;
  const idRegex = /^[a-f0-9]{7,40}$/i;

  const matchUrl = trimmed.match(urlRegex);
  if (matchUrl) {
    return matchUrl[1];
  }
  if (idRegex.test(trimmed)) {
    return trimmed;
  }
  return "";
};

// Remove "https://github.com/" from repo string if present
const getRepoSlug = (repo: string): string => {
  if (!repo) return "";
  return repo.replace(/^(https?:\/\/github\.com\/)/i, "");
};

// Add a utility function to truncate long text
const truncateText = (text: string, maxLength = 20) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  // For filenames with extensions, preserve the extension
  const lastDotIndex = text.lastIndexOf(".");
  if (lastDotIndex > 0) {
    const name = text.substring(0, lastDotIndex);
    const extension = text.substring(lastDotIndex);

    if (name.length <= maxLength - 3) return text;

    return `${name.substring(0, maxLength - 3)}...${extension}`;
  }

  // For URLs or text without extensions
  return `${text.substring(0, maxLength)}...`;
};

export default function TaskDetailPage() {
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<Record<string, FirebaseUser>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [commitId, setCommitId] = useState("");
  const [showChildTasks, setShowChildTasks] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [cloudinaryConfigExists, setCloudinaryConfigExists] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [commentMediaUrl, setCommentMediaUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const taskId = params.taskId as string;
  const [usersLoading, setUsersLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Status change confirmation dialog
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(
    null
  );

  // Subtask creation state
  const [showSubtaskDialog, setShowSubtaskDialog] = useState(false);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskType, setSubtaskType] = useState(TASK_TYPE.FEATURE);
  const [subtaskPriority, setSubtaskPriority] = useState(TASK_PRIORITY.MEDIUM);
  const [subtaskDueDate, setSubtaskDueDate] = useState<Date | undefined>(
    undefined
  );
  const [subtaskEstimatedTime, setSubtaskEstimatedTime] = useState<
    number | undefined
  >(undefined);
  const [subtaskAssignedTo, setSubtaskAssignedTo] = useState<string[]>([]);
  const [subtaskTags, setSubtaskTags] = useState<string[]>([]);
  const [subtaskTagInput, setSubtaskTagInput] = useState<string>("");
  const [subtaskCommitId, setSubtaskCommitId] = useState<string>("");
  const [subtaskMedia, setSubtaskMedia] = useState<any[]>([]);

  // Subtask filtering state
  const [subtaskFilters, setSubtaskFilters] = useState({
    status: [] as string[],
    type: [] as string[],
    priority: [] as string[],
    assignee: [] as string[],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredChildTasks, setFilteredChildTasks] = useState<Task[]>([]);

  // Comment pagination
  const [commentsPage, setCommentsPage] = useState(1);
  const commentsPerPage = 10;
  const totalCommentPages = Math.ceil(comments.length / commentsPerPage);
  const paginatedComments = comments.slice(0, commentsPage * commentsPerPage);
  const hasMoreComments = commentsPage < totalCommentPages;

  // Subtask pagination
  const [subtasksPage, setSubtasksPage] = useState(1);
  const subtasksPerPage = 5;
  const totalSubtaskPages = Math.ceil(
    filteredChildTasks.length / subtasksPerPage
  );
  const paginatedSubtasks = filteredChildTasks.slice(
    (subtasksPage - 1) * subtasksPerPage,
    subtasksPage * subtasksPerPage
  );

  // Check if we're on a mobile device
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const isMobileDevice = useIsMobile();

  // Calculate completion percentage based on child tasks
  const calculatePercentDone = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return 0;

    const totalPercent = tasks.reduce((sum, task) => {
      return sum + (task.percentDone || 0);
    }, 0);

    return Math.round(totalPercent / tasks.length);
  };

  // Log task history
  const logTaskHistory = async (entry: Omit<TaskHistory, "id">) => {
    try {
      const historyRef = push(ref(database, "taskHistory"));
      await set(historyRef, entry);
      setHistory((prev) => [
        { id: historyRef.key as string, ...entry },
        ...prev,
      ]);
    } catch (error) {
      console.error("Error logging task history:", error);
      toast({
        title: "Error",
        description: "Failed to log task history",
        variant: "destructive",
      });
    }
  };

  // Update parent task progress (if exists)
  const updateParentTaskProgress = async (
    parentTaskId: string,
    childTasks: Task[]
  ) => {
    if (!parentTaskId || childTasks.length === 0) return;

    try {
      const newPercentDone = calculatePercentDone(childTasks);

      const parentTaskRef = ref(database, `tasks/${parentTaskId}`);
      await update(parentTaskRef, {
        percentDone: newPercentDone,
        updatedAt: new Date().toISOString(),
      });

      if (task && task.id === parentTaskId) {
        setTask((prev) =>
          prev
            ? {
                ...prev,
                percentDone: newPercentDone,
                updatedAt: new Date().toISOString(),
              }
            : prev
        );
      }

      if (user) {
        await logTaskHistory({
          taskId: parentTaskId,
          userId: user.uid,
          timestamp: new Date().toISOString(),
          changes: [
            {
              field: "percentDone",
              oldValue: task?.percentDone?.toString() || "0",
              newValue: newPercentDone.toString(),
            },
          ],
          comment: "Progress updated automatically based on subtasks",
        });
      }
    } catch (error) {
      console.error("Error updating parent task progress:", error);
      toast({
        title: "Error",
        description: "Failed to update parent task progress",
        variant: "destructive",
      });
    }
  };

  const fetchTaskData = useCallback(async () => {
    if (!user || !projectId || !taskId) return;

    try {
      setLoading(true);
      // Fetch task details
      const taskRef = ref(database, `tasks/${taskId}`);
      const taskSnapshot = await get(taskRef);

      if (!taskSnapshot.exists()) {
        toast({
          title: "Task not found",
          description: "The task you're looking for doesn't exist",
          variant: "destructive",
        });
        router.push(`/projects/${projectId}`);
        return;
      }

      const taskData = {
        id: taskId,
        ...taskSnapshot.val(),
      };

      // Check if task belongs to this project
      if (taskData.projectId !== projectId) {
        toast({
          title: "Invalid task",
          description: "This task doesn't belong to the current project",
          variant: "destructive",
        });
        router.push(`/projects/${projectId}`);
        return;
      }

      setTask(taskData);

      // Fetch project to check if user is a member
      const projectRef = ref(database, `projects/${projectId}`);
      const projectSnapshot = await get(projectRef);

      if (!projectSnapshot.exists()) {
        toast({
          title: "Project not found",
          description: "The project you're looking for doesn't exist",
          variant: "destructive",
        });
        router.push("/projects");
        return;
      }

      const projectData = projectSnapshot.val();
      setProjectData(projectData);

      // Check if user is a member of this project
      if (!projectData.members || !projectData.members[user.uid]) {
        toast({
          title: "Access denied",
          description: "You don't have access to this project",
          variant: "destructive",
        });
        router.push("/projects");
        return;
      }

      // Check if Cloudinary is configured for this project
      const cloudinaryConfig = await getCloudinaryConfigByProjectId(projectId);
      setCloudinaryConfigExists(!!cloudinaryConfig);

      // Fetch all users involved in this task
      const userIds = new Set<string>();
      userIds.add(taskData.createdBy);

      if (taskData.assignedTo) {
        taskData.assignedTo.forEach((id: string) => userIds.add(id));
      }

      const usersData: Record<string, FirebaseUser> = {};

      for (const userId of userIds) {
        const userRef = ref(database, `users/${userId}`);
        const userSnapshot = await get(userRef);

        if (userSnapshot.exists()) {
          usersData[userId] = {
            id: userId,
            ...userSnapshot.val(),
          };
        }
      }

      setUsers(usersData);

      // Fetch comments for this task
      const commentsRef = ref(database, "comments");
      const commentsQuery = query(
        commentsRef,
        orderByChild("taskId"),
        equalTo(taskId)
      );
      const commentsSnapshot = await get(commentsQuery);

      if (commentsSnapshot.exists()) {
        const commentsData = commentsSnapshot.val();
        const commentsList = Object.entries(commentsData)
          .map(([id, data]: [string, any]) => ({
            id,
            ...data,
          }))
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        setComments(commentsList);

        // Add comment authors to users
        for (const comment of commentsList) {
          if (!usersData[comment.userId]) {
            const userRef = ref(database, `users/${comment.userId}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists()) {
              usersData[comment.userId] = {
                id: comment.userId,
                ...userSnapshot.val(),
              };
            }
          }
        }
      } else {
        // Initialize comments as an empty array if none exist
        setComments([]);
      }

      // Fetch task history
      const historyRef = ref(database, "taskHistory");
      const historyQuery = query(
        historyRef,
        orderByChild("taskId"),
        equalTo(taskId)
      );
      const historySnapshot = await get(historyQuery);

      if (historySnapshot.exists()) {
        const historyData = historySnapshot.val();
        const historyList = Object.entries(historyData)
          .map(([id, data]: [string, any]) => ({
            id,
            ...data,
          }))
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        setHistory(historyList);

        // Add history authors to users
        for (const entry of historyList) {
          if (!usersData[entry.userId]) {
            const userRef = ref(database, `users/${entry.userId}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists()) {
              usersData[entry.userId] = {
                id: entry.userId,
                ...userSnapshot.val(),
              };
            }
          }
        }
      } else {
        // Initialize history as an empty array if none exists
        setHistory([]);
      }

      // Fetch parent task if exists
      if (taskData.parentTaskId) {
        const parentTaskRef = ref(database, `tasks/${taskData.parentTaskId}`);
        const parentTaskSnapshot = await get(parentTaskRef);

        if (parentTaskSnapshot.exists()) {
          setParentTask({
            id: taskData.parentTaskId,
            ...parentTaskSnapshot.val(),
          });
        }
      }

      // Fetch child tasks
      const tasksRef = ref(database, "tasks");
      const childTasksQuery = query(
        tasksRef,
        orderByChild("parentTaskId"),
        equalTo(taskId)
      );
      const childTasksSnapshot = await get(childTasksQuery);

      if (childTasksSnapshot.exists()) {
        const childTasksData = childTasksSnapshot.val();
        const childTasksList = Object.entries(childTasksData).map(
          ([id, data]: [string, any]) => ({
            id,
            ...data,
          })
        );

        setChildTasks(childTasksList);

        if (childTasksList.length > 0) {
          const calculatedPercent = calculatePercentDone(childTasksList);
          if (
            taskData.percentDone === undefined ||
            taskData.percentDone !== calculatedPercent
          ) {
            const taskRef = ref(database, `tasks/${taskId}`);
            await update(taskRef, {
              percentDone: calculatedPercent,
              updatedAt: new Date().toISOString(),
            });

            setTask({
              ...taskData,
              percentDone: calculatedPercent,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } else {
        // Initialize childTasks as an empty array if none exist
        setChildTasks([]);
      }

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching task data:", error);
      toast({
        title: "Error",
        description: "Failed to load task data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, projectId, taskId, router, toast]);

  // Filter subtasks when filters or childTasks change
  useEffect(() => {
    if (!childTasks) {
      setFilteredChildTasks([]);
      return;
    }

    const filtered = childTasks.filter((task) => {
      // Status filter
      if (
        subtaskFilters.status.length > 0 &&
        !subtaskFilters.status.includes(task.status)
      ) {
        return false;
      }

      // Type filter
      if (
        subtaskFilters.type.length > 0 &&
        !subtaskFilters.type.includes(task.type)
      ) {
        return false;
      }

      // Priority filter
      if (
        subtaskFilters.priority.length > 0 &&
        !subtaskFilters.priority.includes(task.priority)
      ) {
        return false;
      }

      // Assignee filter
      if (subtaskFilters.assignee.length > 0) {
        // Special case for "me" filter
        if (subtaskFilters.assignee.includes("me")) {
          if (!task.assignedTo || !user) return false;

          // If "me" is selected, check if current user is assigned
          const isCurrentUserAssigned = task.assignedTo.includes(user.uid);

          // If other assignees are also selected, check those too
          const otherAssignees = subtaskFilters.assignee.filter(
            (id) => id !== "me"
          );
          const hasOtherMatchingAssignee =
            otherAssignees.length > 0
              ? task.assignedTo.some((userId) =>
                  otherAssignees.includes(userId)
                )
              : true;

          // Return true only if current user is assigned AND (no other assignees selected OR other matching assignees exist)
          if (!isCurrentUserAssigned) return false;
          if (otherAssignees.length > 0 && !hasOtherMatchingAssignee)
            return false;
        } else {
          // Regular assignee filtering (no "me" selected)
          if (!task.assignedTo || task.assignedTo.length === 0) {
            return false;
          }

          const hasMatchingAssignee = task.assignedTo.some((userId) =>
            subtaskFilters.assignee.includes(userId)
          );
          if (!hasMatchingAssignee) {
            return false;
          }
        }
      }

      return true;
    });

    setFilteredChildTasks(filtered);
    // Reset to first page when filters change
    setSubtasksPage(1);
  }, [childTasks, subtaskFilters, user]);

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !taskId || !commentText.trim()) return;

    setIsSubmittingComment(true);

    try {
      // Create new comment
      const newCommentRef = push(ref(database, "comments"));

      const newComment = {
        taskId,
        userId: user.uid,
        content: commentText.trim(),
        createdAt: new Date().toISOString(),
        mediaUrl: commentMediaUrl,
      };

      await set(newCommentRef, newComment);

      // Create notifications for assigned members
      if (task?.assignedTo) {
        for (const assignedUserId of task.assignedTo) {
          if (assignedUserId !== user.uid) {
            const notificationRef = push(ref(database, "notifications"));
            const notification = {
              userId: assignedUserId,
              eventType: "ADD_COMMENT",
              referenceId: taskId,
              message: `New comment on task "${task.title}"`,
              status: "unread",
              createdAt: new Date().toISOString(),
            };

            await set(notificationRef, notification);
          }
        }
      }

      // Update local state with new comment
      setComments([
        ...comments,
        {
          id: newCommentRef.key as string,
          ...newComment,
        },
      ]);

      // Log "add comment" action to history
      const commentLog =
        commentText.trim().length <= 100
          ? commentText.trim()
          : commentText.trim().slice(0, 100) + "...";
      await logTaskHistory({
        taskId,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes: [],
        comment: `Comment added: ${commentLog}`,
      });

      setCommentText("");
      setCommentMediaUrl(null);
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Initiate status update - show confirmation dialog
  const initiateStatusUpdate = (newStatus: string) => {
    setPendingStatusChange(newStatus);
    setShowStatusConfirmDialog(true);
  };

  // Confirm and execute status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!user || !task) return;

    setIsUpdatingStatus(true);
    setShowStatusConfirmDialog(false);

    try {
      const oldStatus = task.status;

      // Update task status
      const taskRef = ref(database, `tasks/${taskId}`);

      const updates: {
        status: string;
        updatedAt: string;
        gitCommitId?: string;
      } = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      // If changing to RESOLVED and commit ID provided, extract and save the commit ID
      const parsedCommitId = extractCommitId(commitId);
      if (newStatus === TASK_STATUS.RESOLVED && parsedCommitId) {
        updates.gitCommitId = parsedCommitId;
      }

      await update(taskRef, updates);

      // Prepare changes to log in history
      const changes = [
        {
          field: "status",
          oldValue: oldStatus,
          newValue: newStatus,
        },
      ];
      if (newStatus === TASK_STATUS.RESOLVED && parsedCommitId) {
        changes.push({
          field: "gitCommitId",
          oldValue: task.gitCommitId || "",
          newValue: parsedCommitId,
        });
      }

      await logTaskHistory({
        taskId,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes,
        comment:
          newStatus === TASK_STATUS.RESOLVED && parsedCommitId
            ? `Status updated with commit: ${parsedCommitId}`
            : "Status updated",
      });

      // Create notifications for assigned members (except the updater)
      if (task.assignedTo) {
        for (const assignedUserId of task.assignedTo) {
          if (assignedUserId !== user.uid) {
            const notificationRef = push(ref(database, "notifications"));
            const notification = {
              userId: assignedUserId,
              eventType: "UPDATE_TASK",
              referenceId: taskId,
              message: `Task "${task.title}" status changed to ${getStatusLabel(
                newStatus
              )}`,
              status: "unread",
              createdAt: new Date().toISOString(),
            };

            await set(notificationRef, notification);
          }
        }
      }

      // Update local state
      setTask({
        ...task,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        gitCommitId:
          newStatus === TASK_STATUS.RESOLVED && parsedCommitId
            ? parsedCommitId
            : task.gitCommitId,
      });

      setCommitId("");
      toast({
        title: "Status updated",
        description: `Task status changed to ${getStatusLabel(newStatus)}`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
      setPendingStatusChange(null);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !taskId || !subtaskTitle.trim()) {
      toast({
        title: "Validation error",
        description: "Subtask title is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingSubtask(true);

    try {
      const parsedCommitId = extractCommitId(subtaskCommitId);

      // Sanitize media attachments by removing undefined values
      const sanitizedMediaAttachments = subtaskMedia.map((media) =>
        Object.fromEntries(
          Object.entries(media).filter(([_, value]) => value !== undefined)
        )
      );

      // Create new subtask
      const newTaskRef = push(ref(database, "tasks"));
      const newTask: Omit<Task, "id"> = {
        projectId,
        title: subtaskTitle,
        description: subtaskDescription || "",
        type: subtaskType,
        status: TASK_STATUS.TODO,
        priority: subtaskPriority,
        assignedTo: subtaskAssignedTo || [],
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: subtaskDueDate ? subtaskDueDate.toISOString() : null,
        percentDone: 0,
        estimatedTime:
          subtaskEstimatedTime !== undefined ? subtaskEstimatedTime : null,
        parentTaskId: taskId,
        tags: subtaskTags,
        gitCommitId: parsedCommitId || null,
        mediaAttachments: sanitizedMediaAttachments.map((media) => ({
          publicId: media.publicId as string,
          url: media.url as string,
          resourceType: media.resourceType as string,
          format: media.format as string,
        })), // Ensure media attachments conform to MediaAttachment type
      };

      await set(newTaskRef, newTask);

      // Create task history
      const historyRef = push(ref(database, "taskHistory"));
      const historyEntry = {
        taskId: newTaskRef.key,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        changes: [
          { field: "status", oldValue: null, newValue: TASK_STATUS.TODO },
        ],
        comment: "Subtask created",
      };
      await set(historyRef, historyEntry);

      // Create notifications for assigned members
      if (subtaskAssignedTo && subtaskAssignedTo.length > 0) {
        for (const assignedUserId of subtaskAssignedTo) {
          if (assignedUserId !== user.uid) {
            const notificationRef = push(ref(database, "notifications"));
            const notification = {
              userId: assignedUserId,
              eventType: "CREATE_TASK",
              referenceId: newTaskRef.key,
              message: `You have been assigned to subtask "${subtaskTitle}"`,
              status: "unread",
              createdAt: new Date().toISOString(),
            };
            await set(notificationRef, notification);
          }
        }
      }

      // Update local state
      const newSubtask: Task = {
        id: newTaskRef.key as string,
        ...newTask,
      };
      setChildTasks([...childTasks, newSubtask]);

      // Update parent task progress
      await updateParentTaskProgress(taskId, [...childTasks, newSubtask]);

      // Reset form
      setSubtaskTitle("");
      setSubtaskDescription("");
      setSubtaskType(TASK_TYPE.FEATURE);
      setSubtaskPriority(TASK_PRIORITY.MEDIUM);
      setSubtaskDueDate(undefined);
      setSubtaskEstimatedTime(undefined);
      setSubtaskAssignedTo([]);
      setSubtaskTags([]);
      setSubtaskTagInput("");
      setSubtaskCommitId("");
      setSubtaskMedia([]);

      // Close dialog
      setShowSubtaskDialog(false);

      // Switch to subtasks tab
      setActiveTab("subtasks");

      toast({
        title: "Subtask created",
        description: "New subtask has been created successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error creating subtask:", error);
      toast({
        title: "Error",
        description: "Failed to create subtask. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSubtask(false);
    }
  };

  const canUpdateStatus = () => {
    if (!user || !task || !projectData) return false;

    const roles = projectData.members?.[user.uid]?.roles || [];

    switch (task.status) {
      case TASK_STATUS.TODO:
        return task.assignedTo?.includes(user.uid) || roles.includes("dev");
      case TASK_STATUS.IN_PROGRESS:
        return roles.includes("dev");
      case TASK_STATUS.RESOLVED:
        return roles.includes("tester");
      case TASK_STATUS.CLOSED:
        return roles.includes("tester");
      default:
        return false;
    }
  };

  const getNextStatus = () => {
    switch (task?.status) {
      case TASK_STATUS.TODO:
        return TASK_STATUS.IN_PROGRESS;
      case TASK_STATUS.IN_PROGRESS:
        return TASK_STATUS.RESOLVED;
      case TASK_STATUS.RESOLVED:
        return TASK_STATUS.CLOSED;
      case TASK_STATUS.CLOSED:
        return TASK_STATUS.TODO;
      default:
        return null;
    }
  };

  const getNextStatusLabel = () => {
    switch (task?.status) {
      case TASK_STATUS.TODO:
        return "Start Progress";
      case TASK_STATUS.IN_PROGRESS:
        return "Resolve";
      case TASK_STATUS.RESOLVED:
        return "Close";
      case TASK_STATUS.CLOSED:
        return "Reopen";
      default:
        return "";
    }
  };

  const getStatusChangeMessage = () => {
    if (!task || !pendingStatusChange) return "";

    switch (pendingStatusChange) {
      case TASK_STATUS.TODO:
        return "Are you sure you want to reopen this task? This will change the status from Closed to To Do.";
      case TASK_STATUS.IN_PROGRESS:
        return "Are you sure you want to start progress on this task? This will change the status from To Do to In Progress.";
      case TASK_STATUS.RESOLVED:
        return "Are you sure you want to resolve this task? This will change the status from In Progress to Resolved.";
      case TASK_STATUS.CLOSED:
        return "Are you sure you want to close this task? This will change the status from Resolved to Closed.";
      default:
        return `Are you sure you want to change the status to ${getStatusLabel(
          pendingStatusChange
        )}?`;
    }
  };

  const fetchUserData = async (userId: string) => {
    setUsersLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const userRef = ref(database, `users/${userId}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        setUsers((prev) => ({
          ...prev,
          [userId]: {
            id: userId,
            ...userSnapshot.val(),
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setUsersLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Enhance the profile page to ensure changes are properly reflected:

  // Add this function to refresh user data after successful profile update
  const refreshUserData = async () => {
    if (!user) return;

    try {
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        const refreshedUserData = {
          id: user.uid,
          ...userSnapshot.val(),
        };
        setUsers((prev) => ({
          ...prev,
          [user.uid]: refreshedUserData,
        }));
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  // Modify the handleProfileUpdate function to call refreshUserData after successful update:
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!user) return;

    // setIsSaving(true);
    // setError(null);
    // setSuccess(null);

    try {
      // ... existing validation code ...

      // ... existing update code ...

      // After successful update, refresh the user data
      await refreshUserData();

      // setSuccess("Profile updated successfully");
    } catch (error: any) {
      // ... existing error handling ...
    } finally {
      // setIsSaving(false);
    }
  };

  // Toggle filter for a specific category and value
  const toggleFilter = (
    category: "status" | "type" | "priority" | "assignee",
    value: string
  ) => {
    setSubtaskFilters((prev) => {
      const currentFilters = [...prev[category]];
      const index = currentFilters.indexOf(value);

      if (index === -1) {
        // Add filter
        return {
          ...prev,
          [category]: [...currentFilters, value],
        };
      } else {
        // Remove filter
        currentFilters.splice(index, 1);
        return {
          ...prev,
          [category]: currentFilters,
        };
      }
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSubtaskFilters({
      status: [],
      type: [],
      priority: [],
      assignee: [],
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      subtaskFilters.status.length > 0 ||
      subtaskFilters.type.length > 0 ||
      subtaskFilters.priority.length > 0 ||
      subtaskFilters.assignee.length > 0
    );
  };

  // Get count of active filters
  const getActiveFilterCount = () => {
    return (
      subtaskFilters.status.length +
      subtaskFilters.type.length +
      subtaskFilters.priority.length +
      subtaskFilters.assignee.length
    );
  };

  // Convert users object to array for AssigneeGroup component
  const getAssigneeUsers = () => {
    if (!task || !task.assignedTo) return [];
    return task.assignedTo.filter((id) => users[id]).map((id) => users[id]);
  };

  // Convert subtask assignees to array for AssigneeGroup component
  const getSubtaskAssigneeUsers = () => {
    if (!subtaskAssignedTo) return [];
    return subtaskAssignedTo.filter((id) => users[id]).map((id) => users[id]);
  };

  const handleSubtaskMediaUpload = (result: any) => {
    setSubtaskMedia([...subtaskMedia, result]);
  };

  const handleCommentMediaUpload = (result: any) => {
    setCommentMediaUrl(result.url);
  };

  const isImage = (item: any) => {
    return (
      item?.resourceType === "image" ||
      (item?.format &&
        ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
          item.format.toLowerCase()
        ))
    );
  };

  const isVideo = (item: any) => {
    return (
      item?.resourceType === "video" ||
      (item?.format &&
        ["mp4", "webm", "ogv"].includes(item.format.toLowerCase()))
    );
  };

  const isPdf = (item: any) => {
    return item?.format && item.format.toLowerCase() === "pdf";
  };

  const refreshTaskData = () => {
    fetchTaskData();
    toast({
      title: "Refreshed",
      description: "Task data has been refreshed",
    });
  };

  const loadMoreComments = () => {
    setCommentsPage((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
              <ArrowLeft className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-muted/50 border-b border-border p-6">
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-8 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Task not found</h2>
            <p className="text-muted-foreground max-w-md">
              The task you're looking for doesn't exist or you don't have access
              to it.
            </p>
            <Link href={`/projects/${projectId}`}>
              <Button className="rounded-lg shadow-sm mt-2">
                Go to Project
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Determine which tabs to show
  const tabItems = [
    { id: "details", label: "Details" },
    { id: "comments", label: `Comments (${comments ? comments.length : 0})` },
    { id: "history", label: `History (${history ? history.length : 0})` },
  ];

  if (childTasks && childTasks.length > 0) {
    tabItems.push({ id: "subtasks", label: `Subtasks (${childTasks.length})` });
  }

  if (cloudinaryConfigExists) {
    tabItems.push({ id: "media", label: "Media" });
  }

  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          {parentTask ? (
            <Link
              href={`/projects/${projectId}/tasks/${parentTask.id}`}
              className="text-muted-foreground text-sm hover:text-foreground inline-flex items-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Parent Task
            </Link>
          ) : (
            <Link
              href={`/projects/${projectId}`}
              className="text-muted-foreground text-sm hover:text-foreground inline-flex items-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
            </Link>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={refreshTaskData}
            className="text-muted-foreground hover:text-foreground"
            title="Refresh task data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card className="mb-8 shadow-sm border-border animate-fadeIn overflow-hidden">
          <CardHeader className="bg-muted/50 border-b border-border p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:gap-4 items-start md:flex-row md:items-center">
              <CardTitle className="text-lg sm:text-xl break-words font-bold md:text-2xl max-w-full">
                {task.title}
              </CardTitle>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start md:self-center shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg shadow-sm"
                  onClick={() => setShowSubtaskDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Subtask
                </Button>
                <Link href={`/projects/${projectId}/tasks/${taskId}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg shadow-sm"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </Link>

                {canUpdateStatus() && (
                  <Button
                    onClick={() =>
                      initiateStatusUpdate(getNextStatus() as string)
                    }
                    disabled={isUpdatingStatus}
                    size="sm"
                    className="rounded-lg shadow-sm"
                  >
                    {isUpdatingStatus ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      getNextStatusLabel()
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="type"
                className={getTypeColor(task.type)}
                animation="fade"
              >
                {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
              </Badge>

              <Badge variant="status" className={getStatusColor(task.status)}>
                {getStatusLabel(task.status)}
              </Badge>

              <Badge
                variant="priority"
                className={getPriorityColor(task.priority)}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            </div>

            {parentTask && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="flex text-sm items-center">
                  <span className="text-muted-foreground mr-2">
                    Parent Task:
                  </span>
                  <Link
                    href={`/projects/${projectId}/tasks/${parentTask.id}`}
                    className="flex text-primary hover:underline items-center"
                  >
                    {parentTask.title}
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </p>
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-2"
            >
              {/* Improved TabsList with better scrolling behavior */}
              <div className="relative mb-4">
                <TabsList
                  className={`w-full flex overflow-x-auto overflow-y-hidden scrollbar-hide bg-muted/50 p-2 sm:p-3 rounded-lg`}
                >
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={`flex-shrink-0 min-w-[90px] sm:min-w-[100px] text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5`}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Shadow indicators for scroll on mobile and tablet */}
                {(isMobile || isTablet) && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"></div>
                  </>
                )}
              </div>

              <CardContent className="p-0">
                <TabsContent
                  value="details"
                  className="animate-in fade-in-50 p-3 sm:p-4 md:p-6"
                >
                  {/* Enhanced description section with better visibility */}
                  {task.description ? (
                    <div className="mb-4 sm:mb-6 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border">
                      <div className="flex items-center mb-2">
                        <Info className="h-4 w-4 text-primary mr-2" />
                        <h3 className="font-medium text-primary">
                          Description
                        </h3>
                      </div>
                      <div
                        className="dark:prose-invert max-w-none prose break-words"
                        dangerouslySetInnerHTML={{
                          __html: formatTextWithLinks(
                            task.description,
                            projectData?.githubRepo
                          ),
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mb-4 sm:mb-6 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border">
                      <div className="flex items-center mb-2">
                        <Info className="h-4 w-4 text-muted-foreground mr-2" />
                        <h3 className="font-medium text-muted-foreground">
                          Description
                        </h3>
                      </div>
                      <p className="text-muted-foreground italic">
                        No description provided
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6 sm:grid-cols-2">
                    <div className="flex items-center">
                      <User className="flex-shrink-0 h-4 text-muted-foreground w-4 mr-2" />
                      <span className="text-muted-foreground text-sm">
                        Created by:
                      </span>
                      <span className="text-sm font-medium ml-2 truncate">
                        {users[task.createdBy]?.displayName || "Unknown user"}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="flex-shrink-0 h-4 text-muted-foreground w-4 mr-2" />
                      <span className="text-muted-foreground text-sm">
                        Created:
                      </span>
                      <span className="text-sm ml-2">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <User className="flex-shrink-0 h-4 text-muted-foreground w-4 mr-2" />
                      <span className="text-muted-foreground text-sm">
                        Assigned to:
                      </span>
                      <div className="ml-2">
                        {task.assignedTo && task.assignedTo.length > 0 ? (
                          <div className="flex items-center">
                            <AssigneeGroup
                              users={getAssigneeUsers()}
                              size="sm"
                            />

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="ml-2 text-sm text-muted-foreground hidden md:inline-block">
                                    {task.assignedTo
                                      .map(
                                        (id) =>
                                          users[id]?.displayName || "Unknown"
                                      )
                                      .join(", ")}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Assigned to:{" "}
                                    {task.assignedTo
                                      .map(
                                        (id) =>
                                          users[id]?.displayName || "Unknown"
                                      )
                                      .join(", ")}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>

                    {task.dueDate && (
                      <div className="flex items-center">
                        <Calendar className="flex-shrink-0 h-4 text-muted-foreground w-4 mr-2" />
                        <span className="text-muted-foreground text-sm">
                          Due date:
                        </span>
                        <span className="text-sm ml-2">
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    )}

                    {task.estimatedTime && (
                      <div className="flex items-center">
                        <Clock className="flex-shrink-0 h-4 text-muted-foreground w-4 mr-2" />
                        <span className="text-muted-foreground text-sm">
                          Estimated time:
                        </span>
                        <span className="text-sm ml-2">
                          {task.estimatedTime} hours
                        </span>
                      </div>
                    )}
                    {task.percentDone !== undefined && (
                      <div className="col-span-1 flex items-center sm:col-span-2">
                        <Clock className="flex-shrink-0 h-4 text-muted-foreground w-4 mr-2" />
                        <span className="text-muted-foreground text-sm">
                          Progress:
                        </span>
                        <div className="ml-2 w-full max-w-xs">
                          <Progress
                            value={task.percentDone}
                            className="h-2.5"
                          />
                        </div>
                        <span className="text-xs ml-2">
                          {task.percentDone}%
                        </span>
                      </div>
                    )}

                    {task.tags && task.tags.length > 0 && (
                      <div className="col-span-1 flex items-center sm:col-span-2">
                        <span className="text-muted-foreground text-sm mr-2">
                          Tags:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {task.gitCommitId && projectData?.githubRepo && (
                      <div className="col-span-1 flex items-center sm:col-span-2">
                        <GitCommit className="flex-shrink-0 h-4 text-muted-foreground w-4 mr-2" />
                        <span className="text-muted-foreground text-sm mr-2">
                          Commit:
                        </span>
                        <div className="max-w-[300px] overflow-hidden text-ellipsis">
                          <CommitLink
                            url={`https://github.com/${getRepoSlug(
                              projectData.githubRepo
                            )}/commit/${task.gitCommitId}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {task.status === TASK_STATUS.IN_PROGRESS && user && (
                    <div className="bg-card border border-border p-4 rounded-lg mb-6">
                      <h3 className="text-sm font-medium mb-2">
                        Link a commit when resolving
                      </h3>
                      <div className="flex flex-col gap-2 sm:flex-row items-stretch">
                        <input
                          type="text"
                          placeholder="Enter commit ID or URL"
                          value={commitId}
                          onChange={(e) => setCommitId(e.target.value)}
                          className="flex-1 bg-background border border-input p-2 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                        />
                        <Button
                          onClick={() =>
                            initiateStatusUpdate(TASK_STATUS.RESOLVED)
                          }
                          disabled={isUpdatingStatus}
                          size="sm"
                          className="rounded-lg shadow-sm"
                        >
                          Resolve with Commit
                        </Button>
                      </div>
                    </div>
                  )}

                  {task.mediaAttachments &&
                    task.mediaAttachments.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium mb-3">
                          Media Attachments
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                          {task.mediaAttachments.map((media, index) => (
                            <div
                              key={index}
                              className="border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
                              onClick={() => {
                                setSelectedMedia(media);
                                setShowMediaPreview(true);
                              }}
                            >
                              <div className="aspect-square relative bg-muted">
                                {isImage(media) ? (
                                  <img
                                    src={media.url || "/placeholder.svg"}
                                    alt="Media attachment"
                                    className="object-cover w-full h-full"
                                  />
                                ) : isVideo(media) ? (
                                  <div className="flex items-center justify-center h-full">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                    <span className="absolute bottom-1 right-1 bg-background/80 text-xs px-1 rounded">
                                      Video
                                    </span>
                                  </div>
                                ) : isPdf(media) ? (
                                  <div className="flex items-center justify-center h-full">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                    <span className="absolute bottom-1 right-1 bg-background/80 text-xs px-1 rounded">
                                      PDF
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </TabsContent>

                <TabsContent
                  value="comments"
                  className="animate-in fade-in-50 p-3 sm:p-4 md:p-6"
                >
                  <div className="bg-card border border-border rounded-lg shadow-sm mb-6 overflow-hidden">
                    <div className="p-3 sm:p-4">
                      <form onSubmit={handleCommentSubmit}>
                        <textarea
                          ref={commentInputRef}
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="bg-background border border-input p-3 rounded-lg w-full focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-y transition-colors"
                          disabled={isSubmittingComment}
                        />

                        {commentMediaUrl && (
                          <div className="mt-2 p-2 border rounded-md inline-flex items-center gap-2">
                            <img
                              src={commentMediaUrl || "/placeholder.svg"}
                              alt="Attached media"
                              className="h-10 w-10 object-cover rounded"
                            />
                            <button
                              type="button"
                              className="text-xs text-destructive hover:underline"
                              onClick={() => setCommentMediaUrl(null)}
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        <div className="flex flex-col xs:flex-row justify-between items-stretch xs:items-center gap-2 xs:gap-0 mt-2">
                          <div>
                            {cloudinaryConfigExists && (
                              <CommentMediaUploader
                                projectId={projectId}
                                taskId={taskId}
                                onUploadComplete={handleCommentMediaUpload}
                              />
                            )}
                          </div>
                          <Button
                            type="submit"
                            disabled={
                              isSubmittingComment || !commentText.trim()
                            }
                            className="rounded-lg shadow-sm"
                          >
                            {isSubmittingComment ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Add Comment"
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {comments.length === 0 ? (
                    <div className="bg-card border border-border rounded-lg shadow-sm text-center py-12">
                      <MessageSquare className="h-12 text-muted-foreground w-12 mb-2 mx-auto" />
                      <h3 className="text-lg font-medium mb-1">
                        No comments yet
                      </h3>
                      <p className="text-muted-foreground">
                        Be the first to comment on this task
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paginatedComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-card border border-border rounded-lg shadow-sm animate-fadeIn overflow-hidden"
                        >
                          <div className="p-3 sm:p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center">
                                <Avatar className="h-9 w-9 mr-3">
                                  <AvatarImage
                                    src={
                                      users[comment.userId]?.photoURL ||
                                      undefined ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg"
                                    }
                                    alt={
                                      users[comment.userId]?.displayName ||
                                      "User"
                                    }
                                  />
                                  <AvatarFallback className="bg-primary text-primary-foreground">
                                    {users[comment.userId]?.displayName?.charAt(
                                      0
                                    ) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {users[comment.userId]?.displayName ||
                                      "Unknown user"}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatDateTime(comment.createdAt)}
                                    {comment.updatedAt && " (edited)"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="dark:prose-invert max-w-none pl-12 prose break-words">
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: formatTextWithLinks(
                                    comment.content,
                                    projectData?.githubRepo
                                  ),
                                }}
                              />

                              {comment.mediaUrl && (
                                <div className="mt-3">
                                  <a
                                    href={comment.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block group"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSelectedMedia({
                                        url: comment.mediaUrl,
                                        resourceType: "image",
                                        publicId: "Comment attachment",
                                      });
                                      setShowMediaPreview(true);
                                    }}
                                  >
                                    <div className="relative">
                                      <img
                                        src={
                                          comment.mediaUrl || "/placeholder.svg"
                                        }
                                        alt="Comment attachment"
                                        className="max-h-48 rounded-md border border-border group-hover:border-primary transition-colors"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="h-6 w-6 text-white drop-shadow-md" />
                                      </div>
                                    </div>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {hasMoreComments && (
                        <div className="flex justify-center pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMoreComments}
                            className="rounded-lg"
                          >
                            Load More Comments
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="history"
                  className="animate-in fade-in-50 p-3 sm:p-4 md:p-6"
                >
                  {history.length === 0 ? (
                    <div className="bg-card border border-border rounded-lg shadow-sm text-center py-12">
                      <Clock className="h-12 text-muted-foreground w-12 mb-2 mx-auto" />
                      <h3 className="text-lg font-medium mb-1">
                        No history yet
                      </h3>
                      <p className="text-muted-foreground">
                        Task history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg shadow-sm animate-fadeIn overflow-hidden">
                      <ScrollArea className="h-[500px] p-4">
                        <ul className="space-y-4">
                          {history.map((entry) => (
                            <li
                              key={entry.id}
                              className="border-b border-border last:border-0 last:pb-0 pb-4"
                            >
                              <div className="flex items-start mb-1">
                                <Avatar className="h-7 w-7 mr-2 mt-0.5">
                                  <AvatarImage
                                    src={
                                      users[entry.userId]?.photoURL || undefined
                                    }
                                    alt={
                                      users[entry.userId]?.displayName || "User"
                                    }
                                  />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {users[entry.userId]?.displayName?.charAt(
                                      0
                                    ) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 break-words">
                                  <p className="text-sm">
                                    <span className="font-medium">
                                      {users[entry.userId]?.displayName ||
                                        "Unknown user"}
                                    </span>{" "}
                                    {entry.changes &&
                                    entry.changes.length > 0 ? (
                                      entry.changes.map((change, index) => (
                                        <span
                                          key={index}
                                          className="inline-block"
                                        >
                                          {index > 0 && ", "}
                                          changed {change.field} from{" "}
                                          <span className="bg-muted rounded text-xs font-mono px-1.5 py-0.5">
                                            {change.oldValue || "none"}
                                          </span>{" "}
                                          to{" "}
                                          <span className="bg-muted rounded text-xs font-mono px-1.5 py-0.5">
                                            {change.newValue}
                                          </span>
                                        </span>
                                      ))
                                    ) : (
                                      <span>made changes</span>
                                    )}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatDateTime(entry.timestamp)}
                                  </p>
                                </div>
                              </div>
                              {entry.comment && (
                                <div
                                  className="text-muted-foreground text-sm ml-9 mt-1 break-words"
                                  dangerouslySetInnerHTML={{
                                    __html: formatTextWithLinks(
                                      entry.comment,
                                      getRepoSlug(projectData?.githubRepo)
                                    ),
                                  }}
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="subtasks"
                  className="animate-in fade-in-50 p-3 sm:p-4 md:p-6"
                >
                  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-muted/50 p-3 border-b border-border flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          Subtasks ({filteredChildTasks.length}
                          {filteredChildTasks.length !== childTasks.length &&
                            ` of ${childTasks.length}`}
                          )
                        </h3>
                        {hasActiveFilters() && (
                          <Badge
                            variant="outline"
                            className="gap-1 px-1.5 py-0.5"
                          >
                            <span>{getActiveFilterCount()}</span>
                            <button
                              onClick={clearAllFilters}
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              aria-label="Clear all filters"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 ${
                                hasActiveFilters()
                                  ? "border-primary text-primary"
                                  : ""
                              }`}
                            >
                              <Filter className="h-3.5 w-3.5 mr-1" />
                              Filter
                              {getActiveFilterCount() > 0 && (
                                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                                  {getActiveFilterCount()}
                                </span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3" align="end">
                            <ScrollArea className="max-h-[70vh] pr-3">
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium">
                                      Status
                                    </h4>
                                    {subtaskFilters.status.length > 0 && (
                                      <button
                                        onClick={() =>
                                          setSubtaskFilters((prev) => ({
                                            ...prev,
                                            status: [],
                                          }))
                                        }
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {Object.values(TASK_STATUS).map(
                                      (status) => (
                                        <button
                                          key={status}
                                          onClick={() =>
                                            toggleFilter("status", status)
                                          }
                                          className={`flex items-center justify-between px-2 py-1 text-xs rounded ${
                                            subtaskFilters.status.includes(
                                              status
                                            )
                                              ? "bg-primary/10 text-primary"
                                              : "hover:bg-muted"
                                          }`}
                                        >
                                          <span className="flex items-center">
                                            <Badge
                                              variant="status"
                                              className={`${getStatusColor(
                                                status
                                              )} mr-1.5 h-2 w-2 p-0 rounded-full`}
                                            />
                                            {getStatusLabel(status)}
                                          </span>
                                          {subtaskFilters.status.includes(
                                            status
                                          ) && <Check className="h-3 w-3" />}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium">
                                      Type
                                    </h4>
                                    {subtaskFilters.type.length > 0 && (
                                      <button
                                        onClick={() =>
                                          setSubtaskFilters((prev) => ({
                                            ...prev,
                                            type: [],
                                          }))
                                        }
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {Object.values(TASK_TYPE).map((type) => (
                                      <button
                                        key={type}
                                        onClick={() =>
                                          toggleFilter("type", type)
                                        }
                                        className={`flex items-center justify-between px-2 py-1 text-xs rounded ${
                                          subtaskFilters.type.includes(type)
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted"
                                        }`}
                                      >
                                        <span className="flex items-center">
                                          <Badge
                                            variant="type"
                                            className={`${getTypeColor(
                                              type
                                            )} mr-1.5 h-2 w-2 p-0 rounded-full`}
                                          />
                                          {type.charAt(0).toUpperCase() +
                                            type.slice(1)}
                                        </span>
                                        {subtaskFilters.type.includes(type) && (
                                          <Check className="h-3 w-3" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <Separator />

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium">
                                      Priority
                                    </h4>
                                    {subtaskFilters.priority.length > 0 && (
                                      <button
                                        onClick={() =>
                                          setSubtaskFilters((prev) => ({
                                            ...prev,
                                            priority: [],
                                          }))
                                        }
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {Object.values(TASK_PRIORITY).map(
                                      (priority) => (
                                        <button
                                          key={priority}
                                          onClick={() =>
                                            toggleFilter("priority", priority)
                                          }
                                          className={`flex items-center justify-between px-2 py-1 text-xs rounded ${
                                            subtaskFilters.priority.includes(
                                              priority
                                            )
                                              ? "bg-primary/10 text-primary"
                                              : "hover:bg-muted"
                                          }`}
                                        >
                                          <span className="flex items-center">
                                            <Badge
                                              variant="priority"
                                              className={`${getPriorityColor(
                                                priority
                                              )} mr-1.5 h-2 w-2 p-0 rounded-full`}
                                            />
                                            {priority.charAt(0).toUpperCase() +
                                              priority.slice(1)}
                                          </span>
                                          {subtaskFilters.priority.includes(
                                            priority
                                          ) && <Check className="h-3 w-3" />}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium">
                                      Assignee
                                    </h4>
                                    {subtaskFilters.assignee.length > 0 && (
                                      <button
                                        onClick={() =>
                                          setSubtaskFilters((prev) => ({
                                            ...prev,
                                            assignee: [],
                                          }))
                                        }
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>

                                  {/* Add "Me" option at the top of assignee list */}
                                  {user && (
                                    <button
                                      onClick={() =>
                                        toggleFilter("assignee", "me")
                                      }
                                      className={`flex items-center justify-between px-2 py-1 text-xs rounded w-full mb-2 ${
                                        subtaskFilters.assignee.includes("me")
                                          ? "bg-primary/10 text-primary"
                                          : "hover:bg-muted"
                                      }`}
                                    >
                                      <span className="flex items-center">
                                        <UserCircle className="h-4 w-4 mr-1.5 text-primary" />
                                        <span className="font-medium">Me</span>
                                      </span>
                                      {subtaskFilters.assignee.includes(
                                        "me"
                                      ) && (
                                        <Check className="h-3 w-3 flex-shrink-0" />
                                      )}
                                    </button>
                                  )}

                                  <div className="max-h-40 overflow-y-auto pr-1 space-y-1">
                                    {Object.entries(users).map(
                                      ([userId, userData]) => (
                                        <button
                                          key={userId}
                                          onClick={() =>
                                            toggleFilter("assignee", userId)
                                          }
                                          className={`flex items-center justify-between px-2 py-1 text-xs rounded w-full ${
                                            subtaskFilters.assignee.includes(
                                              userId
                                            )
                                              ? "bg-primary/10 text-primary"
                                              : "hover:bg-muted"
                                          }`}
                                        >
                                          <span className="flex items-center">
                                            <Avatar className="h-5 w-5 mr-1.5">
                                              <AvatarImage
                                                src={
                                                  userData.photoURL ||
                                                  "/placeholder.svg" ||
                                                  "/placeholder.svg" ||
                                                  "/placeholder.svg" ||
                                                  "/placeholder.svg" ||
                                                  "/placeholder.svg" ||
                                                  "/placeholder.svg"
                                                }
                                              />
                                              <AvatarFallback className="text-[10px]">
                                                {userData.displayName?.charAt(
                                                  0
                                                ) || "?"}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">
                                              {userData.displayName}
                                            </span>
                                          </span>
                                          {subtaskFilters.assignee.includes(
                                            userId
                                          ) && (
                                            <Check className="h-3 w-3 flex-shrink-0" />
                                          )}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>

                                {hasActiveFilters() && (
                                  <div className="pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-xs h-8"
                                      onClick={clearAllFilters}
                                    >
                                      Clear All Filters
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 p-0 rounded-full w-7"
                          onClick={() => setShowChildTasks(!showChildTasks)}
                          aria-label={
                            showChildTasks ? "Hide subtasks" : "Show subtasks"
                          }
                        >
                          {showChildTasks ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {showChildTasks && (
                      <>
                        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                          <table className="w-full min-w-[700px]">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left text-sm font-medium px-4 py-2 w-[40%]">
                                  Title
                                </th>
                                <th className="text-left text-sm font-medium px-4 py-2 w-[20%]">
                                  Status
                                </th>
                                <th className="text-left text-sm font-medium px-4 py-2 w-[25%]">
                                  Assigned To
                                </th>
                                <th className="text-left text-sm font-medium px-4 py-2 w-[15%]">
                                  Progress
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedSubtasks.length > 0 ? (
                                paginatedSubtasks.map((childTask) => {
                                  // Convert child task assignees to user objects for AssigneeGroup
                                  const childTaskUsers = childTask.assignedTo
                                    ? childTask.assignedTo
                                        .filter((id) => users[id])
                                        .map((id) => users[id])
                                    : [];

                                  return (
                                    <tr
                                      key={childTask.id}
                                      className="border-b border-border hover:bg-muted/70 last:border-0 transition-colors h-14"
                                    >
                                      <td className="px-4 py-2">
                                        <Link
                                          href={`/projects/${projectId}/tasks/${childTask.id}`}
                                          className="text-primary hover:underline truncate block max-w-[250px]"
                                          title={childTask.title}
                                        >
                                          {childTask.title}
                                        </Link>
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap">
                                        <Badge
                                          variant="status"
                                          className={getStatusColor(
                                            childTask.status
                                          )}
                                        >
                                          {getStatusLabel(childTask.status)}
                                        </Badge>
                                      </td>
                                      <td className="px-4 py-2">
                                        {childTask.assignedTo &&
                                        childTask.assignedTo.length > 0 ? (
                                          <div className="flex items-center">
                                            <AssigneeGroup
                                              users={childTaskUsers}
                                              size="sm"
                                              maxVisible={2}
                                            />

                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="ml-2 text-sm text-muted-foreground truncate max-w-[120px] inline-block">
                                                    {childTask.assignedTo
                                                      .map(
                                                        (id) =>
                                                          users[id]
                                                            ?.displayName ||
                                                          "Unknown"
                                                      )
                                                      .join(", ")}
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>
                                                    {childTask.assignedTo
                                                      .map(
                                                        (id) =>
                                                          users[id]
                                                            ?.displayName ||
                                                          "Unknown"
                                                      )
                                                      .join(", ")}
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-sm italic">
                                            Unassigned
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {childTask.percentDone !==
                                          undefined && (
                                          <div className="flex items-center gap-2">
                                            <Progress
                                              value={childTask.percentDone}
                                              className="h-2 w-24"
                                            />
                                            <span className="text-xs whitespace-nowrap">
                                              {childTask.percentDone}%
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="px-4 py-8 text-center"
                                  >
                                    {childTasks.length > 0 ? (
                                      <>
                                        <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <h3 className="text-base font-medium mb-1">
                                          No matching subtasks
                                        </h3>
                                        <p className="text-muted-foreground text-sm mb-3">
                                          No subtasks match your current filters
                                        </p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={clearAllFilters}
                                        >
                                          Clear All Filters
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <h3 className="text-base font-medium mb-1">
                                          No subtasks yet
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                          Create subtasks to break down this
                                          task
                                        </p>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {filteredChildTasks.length > 5 && (
                          <div className="p-2 border-t border-border">
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    onClick={() =>
                                      setSubtasksPage((prev) =>
                                        Math.max(prev - 1, 1)
                                      )
                                    }
                                    className={
                                      subtasksPage === 1
                                        ? "pointer-events-none opacity-50"
                                        : ""
                                    }
                                  />
                                </PaginationItem>

                                {Array.from({ length: totalSubtaskPages }).map(
                                  (_, i) => (
                                    <PaginationItem key={i}>
                                      <PaginationLink
                                        isActive={subtasksPage === i + 1}
                                        onClick={() => setSubtasksPage(i + 1)}
                                      >
                                        {i + 1}
                                      </PaginationLink>
                                    </PaginationItem>
                                  )
                                )}

                                <PaginationItem>
                                  <PaginationNext
                                    onClick={() =>
                                      setSubtasksPage((prev) =>
                                        Math.min(prev + 1, totalSubtaskPages)
                                      )
                                    }
                                    className={
                                      subtasksPage === totalSubtaskPages
                                        ? "pointer-events-none opacity-50"
                                        : ""
                                    }
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="media"
                  className="animate-in fade-in-50 p-3 sm:p-4 md:p-6"
                >
                  <TaskMediaSection projectId={projectId} taskId={taskId} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Status Change Confirmation Dialog */}
        <AlertDialog
          open={showStatusConfirmDialog}
          onOpenChange={setShowStatusConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Task Status</AlertDialogTitle>
              <AlertDialogDescription>
                {getStatusChangeMessage()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col xs:flex-row space-y-2 xs:space-y-0">
              <AlertDialogCancel
                onClick={() => setPendingStatusChange(null)}
                className="mt-0"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  pendingStatusChange && handleStatusUpdate(pendingStatusChange)
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Confirm Change"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Subtask Dialog */}
        <Dialog open={showSubtaskDialog} onOpenChange={setShowSubtaskDialog}>
          <DialogContent className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Create Subtask</DialogTitle>
              <DialogDescription>
                Create a new subtask for "{task.title}"
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubtask} className="space-y-6">
              <div className="space-y-4">
                <label
                  htmlFor="subtaskTitle"
                  className="block text-sm font-medium"
                >
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="subtaskTitle"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  required
                  disabled={isCreatingSubtask}
                  className="w-full"
                  placeholder="Enter subtask title"
                />
              </div>

              <div className="space-y-4">
                <label
                  htmlFor="subtaskDescription"
                  className="block text-sm font-medium"
                >
                  Description
                </label>
                <Textarea
                  id="subtaskDescription"
                  value={subtaskDescription}
                  onChange={(e) => setSubtaskDescription(e.target.value)}
                  rows={3}
                  disabled={isCreatingSubtask}
                  className="w-full"
                  placeholder="Describe the subtask in detail..."
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-4">
                  <label
                    htmlFor="subtaskType"
                    className="block text-sm font-medium"
                  >
                    Type <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={subtaskType}
                    onValueChange={setSubtaskType}
                    disabled={isCreatingSubtask}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TASK_TYPE.BUG}>Bug</SelectItem>
                      <SelectItem value={TASK_TYPE.FEATURE}>Feature</SelectItem>
                      <SelectItem value={TASK_TYPE.ENHANCEMENT}>
                        Enhancement
                      </SelectItem>
                      <SelectItem value={TASK_TYPE.DOCUMENTATION}>
                        Documentation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="subtaskPriority"
                    className="block text-sm font-medium"
                  >
                    Priority <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={subtaskPriority}
                    onValueChange={setSubtaskPriority}
                    disabled={isCreatingSubtask}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TASK_PRIORITY.LOW}>Low</SelectItem>
                      <SelectItem value={TASK_PRIORITY.MEDIUM}>
                        Medium
                      </SelectItem>
                      <SelectItem value={TASK_PRIORITY.HIGH}>High</SelectItem>
                      <SelectItem value={TASK_PRIORITY.CRITICAL}>
                        Critical
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="subtaskDueDate"
                    className="block text-sm font-medium"
                  >
                    Due Date
                  </label>
                  <DatePicker
                    date={subtaskDueDate}
                    setDate={setSubtaskDueDate}
                    disabled={isCreatingSubtask}
                  />
                </div>

                <div className="space-y-4">
                  <label
                    htmlFor="subtaskEstimatedTime"
                    className="block text-sm font-medium"
                  >
                    Estimated Time (hours)
                  </label>
                  <Input
                    id="subtaskEstimatedTime"
                    type="number"
                    min={0}
                    step={0.5}
                    value={subtaskEstimatedTime || ""}
                    onChange={(e) =>
                      setSubtaskEstimatedTime(
                        e.target.value
                          ? Number.parseFloat(e.target.value)
                          : undefined
                      )
                    }
                    disabled={isCreatingSubtask}
                    className="w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium">Assigned To</label>

                {subtaskAssignedTo.length > 0 && (
                  <div className="mb-2">
                    <AssigneeGroup users={getSubtaskAssigneeUsers()} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(users).map(
                    ([userId, userData]: [string, any]) => (
                      <div key={userId} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subtask-member-${userId}`}
                          checked={subtaskAssignedTo.includes(userId)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSubtaskAssignedTo([
                                ...subtaskAssignedTo,
                                userId,
                              ]);
                            } else {
                              setSubtaskAssignedTo(
                                subtaskAssignedTo.filter((id) => id !== userId)
                              );
                            }
                          }}
                          disabled={isCreatingSubtask}
                        />
                        <label
                          htmlFor={`subtask-member-${userId}`}
                          className="text-sm truncate"
                        >
                          {userData.displayName || userData.email}
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label
                  htmlFor="subtaskTagInput"
                  className="block text-sm font-medium"
                >
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {subtaskTags.map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-muted px-2 py-1 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSubtaskTags(subtaskTags.filter((t) => t !== tag))
                        }
                        className="ml-2 text-destructive"
                        disabled={isCreatingSubtask}
                        aria-label={`Remove tag ${tag}`}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <Input
                  id="subtaskTagInput"
                  placeholder="Enter tag and press Enter"
                  value={subtaskTagInput}
                  onChange={(e) => setSubtaskTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && subtaskTagInput.trim() !== "") {
                      e.preventDefault();
                      if (!subtaskTags.includes(subtaskTagInput.trim())) {
                        setSubtaskTags([
                          ...subtaskTags,
                          subtaskTagInput.trim(),
                        ]);
                      }
                      setSubtaskTagInput("");
                    }
                  }}
                  disabled={isCreatingSubtask}
                  className="w-full mt-2"
                />
              </div>

              {cloudinaryConfigExists && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium">
                    Media Attachments
                  </label>
                  <MediaUploader
                    projectId={projectId}
                    onUploadComplete={handleSubtaskMediaUpload}
                    multiple
                    maxFileSize={10 * 1024 * 1024} // 10MB
                    allowedFileTypes={[
                      "jpg",
                      "jpeg",
                      "png",
                      "gif",
                      "webp",
                      "pdf",
                      "mp4",
                      "webm",
                    ]}
                  />

                  {subtaskMedia.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">
                        Uploaded Media ({subtaskMedia.length})
                      </h4>
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
                        {subtaskMedia.map((media, index) => (
                          <div
                            key={index}
                            className="border rounded-md p-2 flex flex-col"
                          >
                            <div className="aspect-square relative bg-muted rounded-md overflow-hidden">
                              {media.resourceType === "image" ? (
                                <img
                                  src={media.url || "/placeholder.svg"}
                                  alt="Uploaded media"
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <span className="text-xs text-muted-foreground truncate max-w-full px-2">
                                    {media.resourceType}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSubtaskMedia(
                                  subtaskMedia.filter((_, i) => i !== index)
                                )
                              }
                              className="text-xs text-destructive mt-1 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex flex-col xs:flex-row justify-end xs:space-x-4 space-y-2 xs:space-y-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSubtaskDialog(false)}
                  disabled={isCreatingSubtask}
                  className="rounded-lg shadow-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingSubtask}
                  className="rounded-lg shadow-sm"
                >
                  {isCreatingSubtask ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Subtask
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Media Preview Dialog */}
        <Dialog open={showMediaPreview} onOpenChange={setShowMediaPreview}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Media Preview</DialogTitle>
            </DialogHeader>
            {selectedMedia && (
              <div className="mt-4">
                {isImage(selectedMedia) ? (
                  <div className="relative w-full max-h-[70vh] flex items-center justify-center">
                    <Image
                      src={selectedMedia.url || "/placeholder.svg"}
                      alt={selectedMedia.publicId || "Image"}
                      width={800}
                      height={600}
                      className="max-h-[70vh] object-contain"
                    />
                  </div>
                ) : isVideo(selectedMedia) ? (
                  <div className="w-full">
                    <video
                      src={selectedMedia.url}
                      controls
                      className="w-full max-h-[70vh]"
                    />
                  </div>
                ) : isPdf(selectedMedia) ? (
                  <div className="w-full h-[70vh]">
                    <iframe
                      src={selectedMedia.url}
                      className="w-full h-full"
                      title="PDF Viewer"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8">
                    <ImageIcon className="h-16 w-16 mb-4 text-muted-foreground" />
                    <p className="text-center">
                      This file type cannot be previewed.
                      <a
                        href={selectedMedia.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-1"
                      >
                        Open in new tab
                      </a>
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                  <div className="w-full sm:max-w-[70%]">
                    <p className="text-sm font-medium truncate">
                      {selectedMedia.publicId}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedMedia.resourceType}/{selectedMedia.format}
                      {selectedMedia.width &&
                        selectedMedia.height &&
                        ` • ${selectedMedia.width}×${selectedMedia.height}`}
                    </p>
                    <p
                      className="text-xs text-muted-foreground truncate max-w-full overflow-hidden text-ellipsis"
                      title={selectedMedia.url}
                    >
                      {truncateText(selectedMedia.url, 40)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1 sm:flex-initial"
                    >
                      <a
                        href={selectedMedia.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1 sm:flex-initial"
                    >
                      <a href={selectedMedia.url} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

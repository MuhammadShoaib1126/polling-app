import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  IconButton,
  Alert,
  Snackbar,
  Chip,
  Paper,
  Zoom,
  Fade,
  Avatar,
  alpha,
  InputAdornment,
  Backdrop,
  CircularProgress,
  Skeleton,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Slide,
  Switch,
  Tooltip,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LogoutIcon from "@mui/icons-material/Logout";
import PollIcon from "@mui/icons-material/Poll";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import StarIcon from "@mui/icons-material/Star";
import FeedbackIcon from "@mui/icons-material/Feedback";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CloseIcon from "@mui/icons-material/Close";
import EventIcon from "@mui/icons-material/Event";
import LockIcon from "@mui/icons-material/Lock";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import { supabase } from "./supabase";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Alert 
            severity="error" 
            sx={{ borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            }
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Something went wrong
            </Typography>
            <Typography variant="body2">
              {this.state.error?.message || "Please refresh the page to continue."}
            </Typography>
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}

// Premium Color Palette
const COLORS = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
};

// Theme Context
const ColorModeContext = createContext({ toggleColorMode: () => {} });

// Utility function for retry logic
const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <Box>
    {[1, 2].map((i) => (
      <Skeleton
        key={i}
        variant="rounded"
        height={200}
        sx={{ mb: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.1)" }}
      />
    ))}
  </Box>
);

function DashboardContent({ user, onLogout }) {
  const [myPolls, setMyPolls] = useState([]);
  const [activePolls, setActivePolls] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openVote, setOpenVote] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    type: "info",
  });
  const [greeting, setGreeting] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationBadge, setNotificationBadge] = useState(0);
  const [openNotificationDrawer, setOpenNotificationDrawer] = useState(false);
  const [openAnalytics, setOpenAnalytics] = useState(false);
  const [analyticsPoll, setAnalyticsPoll] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const colorMode = useContext(ColorModeContext);
  
  // Refs for preventing race conditions
  const channelRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const fetchPollsRef = useRef(false);
  const notificationTimeoutRef = useRef(null);

  // Expiry states
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");

  const [newPoll, setNewPoll] = useState({
    title: "",
    question: "",
    poll_type: "multiple_choice",
    options: ["", ""],
    correct_answer: "",
  });

  // Reset form helper
  const resetPollForm = useCallback(() => {
    setNewPoll({
      title: "",
      question: "",
      poll_type: "multiple_choice",
      options: ["", ""],
      correct_answer: "",
    });
    setEnableExpiry(false);
    setExpiryDate("");
    setValidationErrors({});
  }, []);

  // Check if a poll is expired
  const isPollExpired = useCallback((poll) => {
    if (!poll.expires_at) return false;
    const expiresTime = new Date(poll.expires_at).getTime();
    const nowTime = new Date().getTime();
    return expiresTime < nowTime;
  }, []);

  // Get expiry status text (memoized)
  const getExpiryStatus = useCallback((poll) => {
    if (!poll.expires_at) return null;
    const expiresTime = new Date(poll.expires_at).getTime();
    const nowTime = new Date().getTime();

    if (expiresTime < nowTime) {
      return {
        label: "Expired",
        color: COLORS.error,
        icon: <LockIcon sx={{ fontSize: 14 }} />,
      };
    }

    const hoursLeft = (expiresTime - nowTime) / (1000 * 60 * 60);
    if (hoursLeft < 24) {
      return {
        label: `Expires in ${Math.ceil(hoursLeft)} hour${Math.ceil(hoursLeft) !== 1 ? "s" : ""}`,
        color: COLORS.warning,
        icon: <AccessTimeIcon sx={{ fontSize: 14 }} />,
      };
    }

    const daysLeft = Math.ceil(hoursLeft / 24);
    return {
      label: `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`,
      color: COLORS.info,
      icon: <EventIcon sx={{ fontSize: 14 }} />,
    };
  }, []);

  // Format expiry date
  const formatExpiryDate = useCallback((timestamp) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch {
      return null;
    }
  }, []);

  // Show notification with auto-cleanup
  const showNotification = useCallback((msg, type) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    setNotification({ open: true, message: msg, type });
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 3000);
  }, []);

  // Fetch user's votes for all polls
  const fetchUserVotes = useCallback(async () => {
    try {
      const { data, error } = await fetchWithRetry(() =>
        supabase
          .from("votes")
          .select("poll_id")
          .eq("user_id", user.id)
      );
      
      if (error) throw error;
      
      const votedPolls = {};
      data?.forEach(vote => {
        votedPolls[vote.poll_id] = true;
      });
      setUserVotes(votedPolls);
    } catch (error) {
      console.error("Error fetching user votes:", error);
      showNotification("Error loading your voting history", "error");
    }
  }, [user.id, showNotification]);

  // Fetch polls with retry logic
  const fetchPolls = useCallback(async () => {
    if (fetchPollsRef.current) return;
    fetchPollsRef.current = true;
    setLoading(true);
    
    try {
      const [myDataResult, activeDataResult] = await Promise.all([
        fetchWithRetry(() =>
          supabase
            .from("polls")
            .select("*")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false })
        ),
        fetchWithRetry(() =>
          supabase
            .from("polls")
            .select("*")
            .neq("created_by", user.id)
            .order("created_at", { ascending: false })
        ),
      ]);

      if (myDataResult.error) throw myDataResult.error;
      if (activeDataResult.error) throw activeDataResult.error;

      setMyPolls(myDataResult.data || []);
      setActivePolls(activeDataResult.data || []);
    } catch (error) {
      console.error("Error fetching polls:", error);
      showNotification("Error loading polls. Please refresh.", "error");
    } finally {
      setLoading(false);
      fetchPollsRef.current = false;
    }
  }, [user.id, showNotification]);

  // Setup realtime subscription for notifications with cleanup
  useEffect(() => {
    const channel = supabase
      .channel("votes-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        async (payload) => {
          const newVote = payload.new;
          try {
            const { data: pollData, error: pollError } = await supabase
              .from("polls")
              .select("title, created_by, expires_at")
              .eq("id", newVote.poll_id)
              .single();

            if (pollError) throw pollError;

            if (pollData?.expires_at && new Date(pollData.expires_at).getTime() < new Date().getTime()) {
              return;
            }

            if (pollData && pollData.created_by === user.id && newVote.user_id !== user.id) {
              const { data: voterData, error: voterError } = await supabase
                .from("users")
                .select("username")
                .eq("id", newVote.user_id)
                .single();

              if (voterError) throw voterError;

              const newNotification = {
                id: Date.now(),
                pollTitle: pollData.title,
                voterName: voterData?.username || "Someone",
                timestamp: new Date(),
                read: false,
              };
              setNotifications(prev => [newNotification, ...prev]);
              setNotificationBadge(prev => prev + 1);
              showNotification(`📢 ${voterData?.username || "Someone"} voted on "${pollData.title}"`, "info");
            }
          } catch (error) {
            console.error("Error processing vote notification:", error);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [user.id, showNotification]);

  // Load data on mount
  useEffect(() => {
    fetchPolls();
    fetchUserVotes();

    const now = new Date();
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good Morning 🌅");
    else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon ☀️");
    else if (hour >= 17 && hour < 21) setGreeting("Good Evening 🌆");
    else setGreeting("Good Night 🌙");
  }, [fetchPolls, fetchUserVotes]);

  const validatePoll = useCallback(() => {
    const errors = {};
    if (!newPoll.title.trim()) errors.title = "Title is required";
    else if (newPoll.title.length < 3)
      errors.title = "Title must be at least 3 characters";
    if (!newPoll.question.trim()) errors.question = "Question is required";
    else if (newPoll.question.length < 5)
      errors.question = "Question must be at least 5 characters";
    if (newPoll.poll_type !== "rating") {
      const validOptions = newPoll.options.filter((opt) => opt.trim());
      if (validOptions.length < 2)
        errors.options = "At least 2 options are required";
      const lowerCaseOptions = validOptions.map(opt => opt.trim().toLowerCase());
      if (lowerCaseOptions.length !== new Set(lowerCaseOptions).size) {
        errors.options = "Options cannot be the same";
      }
    }
    if (newPoll.poll_type === "quiz" && !newPoll.correct_answer)
      errors.correct_answer = "Select correct answer";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newPoll]);

  const handleCreatePoll = async () => {
    if (isSubmittingRef.current) return;
    
    if (!validatePoll()) {
      showNotification("Please fix the errors", "error");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      let expiresAt = null;
      if (enableExpiry && expiryDate) {
        const localDate = new Date(expiryDate);
        localDate.setHours(23, 59, 59, 999);

        if (isNaN(localDate.getTime())) {
          showNotification("Invalid expiry date", "error");
          return;
        }

        if (localDate <= new Date()) {
          showNotification("Expiry date must be in the future", "error");
          return;
        }

        expiresAt = localDate.toISOString();
      }

      const pollData = {
        title: newPoll.title.trim(),
        description: newPoll.question.trim(),
        poll_type: newPoll.poll_type,
        options:
          newPoll.poll_type === "rating"
            ? ["1", "2", "3", "4", "5"]
            : newPoll.options.filter((opt) => opt.trim()),
        created_by: user.id,
        created_at: new Date(),
        expires_at: expiresAt,
      };

      if (newPoll.poll_type === "quiz") {
        pollData.correct_answer = newPoll.correct_answer;
      }

      const { error } = await supabase.from("polls").insert([pollData]);

      if (error) throw error;

      showNotification("✨ Poll created successfully! ✨", "success");
      setOpenCreate(false);
      resetPollForm();
      await fetchPolls();
    } catch (error) {
      console.error("Error creating poll:", error);
      showNotification("Error creating poll: " + error.message, "error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("polls").delete().eq("id", pollId);
      if (error) throw error;
      
      setMyPolls((prev) => prev.filter((p) => p.id !== pollId));
      setActivePolls((prev) => prev.filter((p) => p.id !== pollId));
      showNotification("🗑️ Poll deleted successfully", "success");
    } catch (error) {
      console.error("Delete error:", error);
      showNotification("Error deleting poll: " + error.message, "error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleVote = async () => {
    if (isSubmittingRef.current) return;
    
    if (!selectedAnswer) {
      showNotification("Please select an answer", "error");
      return;
    }

    if (selectedPoll.expires_at && new Date(selectedPoll.expires_at).getTime() < new Date().getTime()) {
      showNotification("🔒 This poll has expired. No more votes accepted.", "error");
      setOpenVote(false);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    try {
      const { data: existingVote, error: checkError } = await supabase
        .from("votes")
        .select("*")
        .eq("poll_id", selectedPoll.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingVote) {
        showNotification("Already responded", "error");
        setOpenVote(false);
        return;
      }

      let isCorrect = false;
      let correctText = "";
      if (selectedPoll.poll_type === "quiz") {
        isCorrect = selectedAnswer === selectedPoll.correct_answer;
        correctText = selectedPoll.correct_answer;
      }

      const { error } = await supabase.from("votes").insert({
        poll_id: selectedPoll.id,
        user_id: user.id,
        answer: selectedAnswer,
        is_correct: isCorrect,
        feedback: feedback.trim() || null,
      });

      if (error) throw error;

      if (selectedPoll.poll_type === "quiz") {
        if (isCorrect) showNotification("🎉 CORRECT! 🎉", "success");
        else showNotification(`❌ WRONG! Answer: ${correctText}`, "info");
      } else {
        showNotification("Response submitted!", "success");
      }
      
      setOpenVote(false);
      setSelectedAnswer("");
      setFeedback("");
      await fetchPolls();
      fetchUserVotes();
    } catch (error) {
      console.error("Vote error:", error);
      showNotification("Error: " + error.message, "error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif,
      ),
    );
    setNotificationBadge((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotificationBadge(0);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const wasUnread = notifications.find((n) => n.id === id && !n.read);
    if (wasUnread) {
      setNotificationBadge((prev) => Math.max(0, prev - 1));
    }
  }, [notifications]);

  // Analytics Dialog Component
  const AnalyticsDialog = React.memo(({ poll, open, onClose }) => {
    const [voteData, setVoteData] = useState([]);
    const [totalVotes, setTotalVotes] = useState(0);
    const [chartType, setChartType] = useState("bar");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (open && poll) {
        loadVoteData();
      }
    }, [open, poll]);

    const loadVoteData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("votes")
          .select("answer")
          .eq("poll_id", poll.id);

        if (error) throw error;

        const counts = {};
        data?.forEach((vote) => {
          counts[vote.answer] = (counts[vote.answer] || 0) + 1;
        });

        const formattedData = Object.entries(counts).map(([name, value]) => ({
          name,
          value,
        }));
        setVoteData(formattedData);
        setTotalVotes(data?.length || 0);
      } catch (error) {
        console.error("Error loading vote data:", error);
      } finally {
        setLoading(false);
      }
    };

    const getTypeColor = () => {
      if (poll?.poll_type === "quiz") return COLORS.warning;
      if (poll?.poll_type === "rating") return COLORS.secondary;
      return COLORS.primary;
    };

    if (loading) {
      return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
          <DialogContent>
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 5,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)"
                : "linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${getTypeColor()}20, transparent)`,
            borderBottom: `1px solid ${alpha(getTypeColor(), 0.2)}`,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              📊 Analytics: {poll?.title}
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant="h4" fontWeight={700} color={getTypeColor()}>
              {totalVotes}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Responses
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <Button
              variant={chartType === "bar" ? "contained" : "outlined"}
              onClick={() => setChartType("bar")}
              sx={{ mr: 1 }}
              startIcon={<BarChartIcon />}
            >
              Bar Chart
            </Button>
            <Button
              variant={chartType === "pie" ? "contained" : "outlined"}
              onClick={() => setChartType("pie")}
              startIcon={<PieChartIcon />}
            >
              Pie Chart
            </Button>
          </Box>

          <Box sx={{ height: 300, mb: 3 }}>
            {voteData.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <Typography color="text.secondary">No votes yet</Typography>
              </Box>
            ) : chartType === "bar" ? (
              <Box sx={{ height: "100%", display: "flex", alignItems: "flex-end", gap: 2, justifyContent: "center" }}>
                {voteData.map((item, idx) => {
                  const maxValue = Math.max(...voteData.map(d => d.value), 1);
                  const height = (item.value / maxValue) * 250;
                  return (
                    <Box key={idx} sx={{ textAlign: "center", flex: 1 }}>
                      <Box
                        sx={{
                          height: `${height}px`,
                          backgroundColor: getTypeColor(),
                          borderRadius: "8px 8px 0 0",
                          transition: "height 0.3s ease",
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                        {item.name.length > 15 ? item.name.substring(0, 12) + "..." : item.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ position: "relative", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <svg width="250" height="250" viewBox="0 0 250 250">
                  <circle cx="125" cy="125" r="100" fill="none" stroke="#e2e8f0" strokeWidth="40" />
                  {(() => {
                    let currentAngle = 0;
                    return voteData.map((item, idx) => {
                      const percentage = totalVotes ? (item.value / totalVotes) * 100 : 0;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      currentAngle = endAngle;
                      const startRad = (startAngle - 90) * (Math.PI / 180);
                      const endRad = (endAngle - 90) * (Math.PI / 180);
                      const x1 = 125 + 100 * Math.cos(startRad);
                      const y1 = 125 + 100 * Math.sin(startRad);
                      const x2 = 125 + 100 * Math.cos(endRad);
                      const y2 = 125 + 100 * Math.sin(endRad);
                      const largeArc = percentage > 50 ? 1 : 0;
                      return (
                        <path
                          key={idx}
                          d={`M 125 125 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={getTypeColor()}
                          opacity={0.7 + (idx * 0.1)}
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                </svg>
                <Box sx={{ position: "absolute", textAlign: "center" }}>
                  <Typography variant="h6" fontWeight={700}>{totalVotes}</Typography>
                  <Typography variant="caption">Total</Typography>
                </Box>
              </Box>
            )}
          </Box>

          {voteData.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Detailed Breakdown
              </Typography>
              {voteData.map((item, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" fontWeight={500}>{item.name}</Typography>
                    <Typography variant="body2" fontWeight={700} color={getTypeColor()}>
                      {item.value} ({totalVotes ? ((item.value / totalVotes) * 100).toFixed(1) : 0}%)
                    </Typography>
                  </Box>
                  <Box sx={{ width: "100%", bgcolor: alpha("#e2e8f0", 0.3), borderRadius: 5, overflow: "hidden" }}>
                    <Box
                      sx={{
                        width: `${totalVotes ? (item.value / totalVotes) * 100 : 0}%`,
                        background: getTypeColor(),
                        height: 8,
                        borderRadius: 5,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    );
  });

  // Poll Card Component with memoization
  const PollCard = React.memo(({ poll, isMyPoll = false }) => {
    const [voteCounts, setVoteCounts] = useState({});
    const [totalVotes, setTotalVotes] = useState(0);
    const [feedbacks, setFeedbacks] = useState([]);
    const [isHovered, setIsHovered] = useState(false);
    const expired = isPollExpired(poll);
    const expiryStatus = getExpiryStatus(poll);
    const hasVoted = userVotes[poll.id] || false;

    useEffect(() => {
      loadVotes();
    }, [poll.id]);

    const loadVotes = async () => {
      try {
        const { data, error } = await supabase
          .from("votes")
          .select("answer, feedback")
          .eq("poll_id", poll.id);

        if (error) throw error;

        const counts = {};
        const fbList = [];
        data?.forEach((vote) => {
          counts[vote.answer] = (counts[vote.answer] || 0) + 1;
          if (vote.feedback) fbList.push(vote.feedback);
        });
        setVoteCounts(counts);
        setTotalVotes(data?.length || 0);
        setFeedbacks(fbList);
      } catch (error) {
        console.error("Error loading votes:", error);
      }
    };

    const getTypeColor = () => {
      if (poll.poll_type === "quiz") return COLORS.warning;
      if (poll.poll_type === "rating") return COLORS.secondary;
      return COLORS.primary;
    };

    const getTypeGradient = () => {
      if (poll.poll_type === "quiz")
        return `linear-gradient(135deg, ${COLORS.warning} 0%, #ea8c1e 100%)`;
      if (poll.poll_type === "rating")
        return `linear-gradient(135deg, ${COLORS.secondary} 0%, #a855f7 100%)`;
      return `linear-gradient(135deg, ${COLORS.primary} 0%, #818cf8 100%)`;
    };

    return (
      <>
        <Card
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          sx={{
            mb: 3,
            borderRadius: 4,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(15, 23, 42, 0.9)"
                : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            transition: "all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1)",
            transform: isHovered ? "translateY(-4px)" : "none",
            boxShadow: isHovered
              ? "0 20px 35px -12px rgba(0,0,0,0.3)"
              : "0 4px 15px rgba(0,0,0,0.1)",
            position: "relative",
            opacity: expired ? 0.8 : 1,
            border: `1px solid ${expired ? alpha(COLORS.error, 0.2) : alpha(getTypeColor(), 0.2)}`,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: expired ? COLORS.error : getTypeGradient(),
              borderRadius: "4px 4px 0 0",
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              flexWrap="wrap"
              gap={2}
            >
              <Box flex={1}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  mb={1.5}
                  flexWrap="wrap"
                >
                  <Chip
                    label={
                      poll.poll_type === "quiz"
                        ? "📚 Quiz"
                        : poll.poll_type === "rating"
                          ? "⭐ Rating"
                          : "📋 Multiple Choice"
                    }
                    size="small"
                    sx={{
                      background: expired ? COLORS.error : getTypeGradient(),
                      color: "white",
                      fontWeight: 600,
                      px: 1.5,
                    }}
                  />
                  {hasVoted && !isMyPoll && (
                    <Chip
                      label="✓ Responded"
                      size="small"
                      sx={{
                        backgroundColor: COLORS.success,
                        color: "white",
                        fontWeight: 600,
                      }}
                    />
                  )}
                  {expiryStatus && (
                    <Tooltip
                      title={
                        poll.expires_at
                          ? `Expires on ${formatExpiryDate(poll.expires_at)}`
                          : ""
                      }
                    >
                      <Chip
                        icon={expiryStatus.icon}
                        label={expiryStatus.label}
                        size="small"
                        sx={{
                          backgroundColor: alpha(expiryStatus.color, 0.15),
                          color: expiryStatus.color,
                          fontWeight: 600,
                          border: `1px solid ${alpha(expiryStatus.color, 0.3)}`,
                        }}
                      />
                    </Tooltip>
                  )}
                  <Box
                    sx={{
                      background: alpha(getTypeColor(), 0.1),
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 3,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: expired ? COLORS.error : getTypeColor(),
                      }}
                    >
                      <TrendingUpIcon
                        sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.5 }}
                      />
                      {totalVotes} {totalVotes === 1 ? "response" : "responses"}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    textDecoration: expired ? "line-through" : "none",
                    color: expired ? "text.secondary" : "text.primary",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {poll.title}
                </Typography>
                <Box
                  sx={{
                    background: alpha(getTypeColor(), 0.05),
                    p: 1.5,
                    borderRadius: 2,
                    mb: 2,
                    borderLeft: `3px solid ${expired ? COLORS.error : getTypeColor()}`,
                  }}
                >
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    📝 {poll.description}
                  </Typography>
                </Box>
                {Object.entries(voteCounts).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {Object.entries(voteCounts).map(([answer, count]) => (
                      <Box key={answer} sx={{ mb: 2 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          mb={0.5}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "text.primary" }}
                          >
                            {poll.poll_type === "rating"
                              ? `⭐ ${answer} Star${answer !== "1" ? "s" : ""}`
                              : answer}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: expired ? COLORS.error : getTypeColor(),
                            }}
                          >
                            {count} (
                            {totalVotes
                              ? ((count / totalVotes) * 100).toFixed(1)
                              : 0}
                            %)
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: "100%",
                            bgcolor: alpha("#e2e8f0", 0.3),
                            borderRadius: 5,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              width: `${totalVotes ? (count / totalVotes) * 100 : 0}%`,
                              background: expired ? COLORS.error : getTypeGradient(),
                              height: 8,
                              borderRadius: 5,
                              transition: "width 0.5s ease",
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                {feedbacks.length > 0 && isMyPoll && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: alpha(COLORS.secondary, 0.08),
                      borderRadius: 2,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <FeedbackIcon sx={{ fontSize: 16, color: COLORS.secondary }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Recent Feedback
                      </Typography>
                    </Box>
                    {feedbacks.slice(0, 2).map((fb, idx) => (
                      <Typography
                        key={idx}
                        variant="caption"
                        display="block"
                        sx={{ fontStyle: "italic", mb: 0.5, color: "text.secondary" }}
                      >
                        "{fb}"
                      </Typography>
                    ))}
                    {feedbacks.length > 2 && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        + {feedbacks.length - 2} more
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              <Box display="flex" flexDirection="column" gap={1}>
                <Tooltip title="View Analytics">
                  <IconButton
                    onClick={() => {
                      setAnalyticsPoll(poll);
                      setOpenAnalytics(true);
                    }}
                    sx={{
                      bgcolor: alpha(COLORS.info, 0.1),
                      "&:hover": {
                        bgcolor: alpha(COLORS.info, 0.2),
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    <BarChartIcon sx={{ color: COLORS.info }} />
                  </IconButton>
                </Tooltip>
                {isMyPoll ? (
                  <Tooltip title="Delete Poll">
                    <IconButton
                      onClick={() => handleDeletePoll(poll.id)}
                      disabled={isSubmitting}
                      sx={{
                        bgcolor: alpha(COLORS.error, 0.1),
                        "&:hover": {
                          bgcolor: alpha(COLORS.error, 0.2),
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      <DeleteIcon sx={{ color: COLORS.error }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<HowToVoteIcon />}
                    onClick={() => {
                      if (expired) {
                        showNotification("🔒 This poll has expired", "error");
                        return;
                      }
                      if (hasVoted) {
                        showNotification("✓ You have already responded to this poll", "info");
                        return;
                      }
                      setSelectedPoll(poll);
                      setOpenVote(true);
                    }}
                    disabled={isSubmitting || expired || hasVoted}
                    sx={{
                      background: expired ? COLORS.error : (hasVoted ? COLORS.success : getTypeGradient()),
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                      px: 3,
                      py: 1,
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                      },
                    }}
                  >
                    {expired ? "Expired" : (hasVoted ? "Responded ✓" : "Vote")}
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
        <AnalyticsDialog
          poll={analyticsPoll}
          open={openAnalytics}
          onClose={() => setOpenAnalytics(false)}
        />
      </>
    );
  }, (prevProps, nextProps) => {
    return prevProps.poll.id === nextProps.poll.id && 
           prevProps.isMyPoll === nextProps.isMyPoll;
  });

  // Notification Drawer Component
  const NotificationDrawer = React.memo(() => (
    <Slide
      direction="left"
      in={openNotificationDrawer}
      mountOnEnter
      unmountOnExit
    >
      <Paper
        sx={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: "85vw",
          zIndex: 1300,
          borderRadius: "20px 0 0 20px",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(15, 23, 42, 0.98)"
              : "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          boxShadow: "-5px 0 30px rgba(0,0,0,0.2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: 2.5,
            borderBottom: `1px solid ${alpha(COLORS.primary, 0.1)}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: alpha(COLORS.primary, 0.05),
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <NotificationsActiveIcon sx={{ color: COLORS.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            {notificationBadge > 0 && (
              <Chip
                label={notificationBadge}
                size="small"
                sx={{ backgroundColor: COLORS.error, color: "white", fontWeight: 600 }}
              />
            )}
          </Box>
          <Box display="flex" gap={1}>
            {notifications.length > 0 && (
              <Button
                size="small"
                onClick={markAllAsRead}
                sx={{ color: COLORS.primary, textTransform: "none" }}
              >
                Mark all read
              </Button>
            )}
            <IconButton
              size="small"
              onClick={() => setOpenNotificationDrawer(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            notifications.map((notif) => (
              <ListItem
                key={notif.id}
                sx={{
                  p: 2,
                  bgcolor: notif.read
                    ? "transparent"
                    : alpha(COLORS.primary, 0.05),
                  cursor: "pointer",
                  "&:hover": { bgcolor: alpha(COLORS.primary, 0.1) },
                }}
                onClick={() => markNotificationAsRead(notif.id)}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      background: COLORS.primary,
                    }}
                  >
                    <HowToVoteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography sx={{ color: "text.primary" }}>
                      {notif.voterName} voted on "{notif.pollTitle}"
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {new Date(notif.timestamp).toLocaleString()}
                    </Typography>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notif.id);
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))
          )}
        </Box>
      </Paper>
    </Slide>
  ));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)"
            : "linear-gradient(145deg, #0f2a3f 0%, #1a3a5f 100%)",
        py: 4,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 60%)",
          pointerEvents: "none",
        },
      }}
    >
      <NotificationDrawer />
      <Backdrop sx={{ color: "#fff", zIndex: 1200 }} open={isSubmitting}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Fade in={true}>
          <Paper
            sx={{
              p: 4,
              mb: 4,
              borderRadius: 5,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(0,0,0,0.5)"
                  : "rgba(255,255,255,0.15)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha("#fff", 0.2)}`,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: COLORS.info, letterSpacing: 3 }}
                >
                  {greeting}
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    color: "white",
                    background: `linear-gradient(135deg, #FFFFFF 0%, ${COLORS.info} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Welcome, {user.username}! 👋
                </Typography>
                <Typography variant="body1" sx={{ color: "#B0E0F0" }}>
                  Create polls, quizzes and ratings. Get real-time responses.
                </Typography>
              </Box>
              <Box display="flex" gap={2}>
                <IconButton
                  onClick={() => setOpenNotificationDrawer(true)}
                  sx={{ bgcolor: "rgba(255,255,255,0.1)" }}
                >
                  <Badge badgeContent={notificationBadge} color="error">
                    <NotificationsIcon sx={{ color: "white" }} />
                  </Badge>
                </IconButton>
                <Paper
                  sx={{
                    p: 0.5,
                    borderRadius: 4,
                    background: "rgba(0,0,0,0.4)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <IconButton onClick={colorMode.toggleColorMode}>
                    {colorMode.mode === "dark" ? (
                      <Brightness7Icon sx={{ color: "white" }} />
                    ) : (
                      <Brightness4Icon sx={{ color: "white" }} />
                    )}
                  </IconButton>
                </Paper>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenCreate(true)}
                  disabled={isSubmitting}
                  sx={{
                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                    borderRadius: 4,
                    px: 4,
                    py: 1.5,
                    fontWeight: 700,
                    textTransform: "none",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
                    },
                    transition: "all 0.2s",
                  }}
                >
                  ✨ Create Poll
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LogoutIcon />}
                  onClick={() => {
                    localStorage.removeItem("pollUser");
                    localStorage.removeItem("themeMode");
                    onLogout();
                  }}
                  disabled={isSubmitting}
                  sx={{
                    borderRadius: 4,
                    px: 3,
                    py: 1.5,
                    color: "white",
                    borderColor: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.2s",
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>

        <Box sx={{ mb: 5 }}>
          <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3 }}>
            <Avatar
              sx={{
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                width: 52,
                height: 52,
                boxShadow: "0 8px 20px rgba(99,102,241,0.3)",
              }}
            >
              <PollIcon />
            </Avatar>
            <Typography variant="h4" sx={{ color: "white", fontWeight: 700 }}>
              My Polls
            </Typography>
            <Chip
              label={`${myPolls.length} total`}
              sx={{ background: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600 }}
            />
          </Box>
          {loading && myPolls.length === 0 ? (
            <LoadingSkeleton />
          ) : myPolls.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 5,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <Typography sx={{ color: "#B0E0F0" }}>
                No polls yet. Click Create to start!
              </Typography>
            </Paper>
          ) : (
            myPolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} isMyPoll={true} />
            ))
          )}
        </Box>

        <Box>
          <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3 }}>
            <Avatar
              sx={{
                background: `linear-gradient(135deg, ${COLORS.secondary}, #a855f7)`,
                width: 52,
                height: 52,
                boxShadow: "0 8px 20px rgba(139,92,246,0.3)",
              }}
            >
              <HowToVoteIcon />
            </Avatar>
            <Typography variant="h4" sx={{ color: "white", fontWeight: 700 }}>
              Active Polls
            </Typography>
            <Chip
              label={`${activePolls.length} available`}
              sx={{ background: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600 }}
            />
          </Box>
          {loading && activePolls.length === 0 ? (
            <LoadingSkeleton />
          ) : activePolls.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 5,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <Typography sx={{ color: "#B0E0F0" }}>
                No active polls from other users.
              </Typography>
            </Paper>
          ) : (
            activePolls.map((poll) => <PollCard key={poll.id} poll={poll} />)
          )}
        </Box>

        {/* Create Poll Dialog */}
        <Dialog
          open={openCreate}
          onClose={() => {
            if (!isSubmitting) {
              setOpenCreate(false);
              resetPollForm();
            }
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 5,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)"
                  : "linear-gradient(145deg, #0f3a5f 0%, #0a2a44 100%)",
              border: `1px solid ${alpha("#fff", 0.2)}`,
            },
          }}
        >
          <DialogTitle
            sx={{
              color: "white",
              fontSize: "1.8rem",
              fontWeight: 800,
              background: `linear-gradient(135deg, #FFFFFF 0%, ${COLORS.info} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ✨ Create New Poll
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Title"
              value={newPoll.title}
              onChange={(e) =>
                setNewPoll({ ...newPoll, title: e.target.value })
              }
              margin="normal"
              placeholder="e.g., Food Preferences Quiz"
              error={!!validationErrors.title}
              helperText={validationErrors.title}
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PollIcon sx={{ color: COLORS.info }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& label": { color: "#B0E0F0" },
                "& input": { color: "white" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: COLORS.info },
                  "&.Mui-focused fieldset": { borderColor: COLORS.primary },
                },
              }}
            />
            <TextField
              fullWidth
              label="Question"
              value={newPoll.question}
              onChange={(e) =>
                setNewPoll({ ...newPoll, question: e.target.value })
              }
              margin="normal"
              multiline
              rows={2}
              placeholder="What would you like to ask?"
              error={!!validationErrors.question}
              helperText={validationErrors.question}
              disabled={isSubmitting}
              sx={{
                "& label": { color: "#B0E0F0" },
                "& textarea": { color: "white" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: COLORS.info },
                  "&.Mui-focused fieldset": { borderColor: COLORS.primary },
                },
              }}
            />
            <TextField
              select
              fullWidth
              label="Poll Type"
              value={newPoll.poll_type}
              onChange={(e) =>
                setNewPoll({
                  ...newPoll,
                  poll_type: e.target.value,
                  options: ["", ""],
                  correct_answer: "",
                })
              }
              margin="normal"
              disabled={isSubmitting}
              sx={{
                "& label": { color: "#B0E0F0" },
                "& .MuiSelect-root": { color: "white" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: COLORS.info },
                  "&.Mui-focused fieldset": { borderColor: COLORS.primary },
                },
              }}
            >
              <MenuItem value="multiple_choice">📋 Multiple Choice</MenuItem>
              <MenuItem value="quiz">📚 Quiz</MenuItem>
              <MenuItem value="rating">⭐ Rating (1-5)</MenuItem>
            </TextField>

            {/* Expiry Section */}
            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableExpiry}
                    onChange={(e) => setEnableExpiry(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: COLORS.primary,
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: COLORS.primary,
                      },
                    }}
                  />
                }
                label="Set Expiry Date"
                sx={{ color: "#B0E0F0", mb: 2 }}
              />

              {enableExpiry && (
                <TextField
                  type="date"
                  label="Expiry Date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split("T")[0] }}
                  fullWidth
                  sx={{
                    "& label": { color: "#B0E0F0" },
                    "& input": { color: "white" },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                      "&:hover fieldset": { borderColor: COLORS.info },
                    },
                  }}
                />
              )}
            </Box>

            {newPoll.poll_type !== "rating" && (
              <>
                <FormLabel
                  sx={{
                    mt: 2,
                    display: "block",
                    color: "#B0E0F0",
                    fontWeight: 600,
                  }}
                >
                  Options{" "}
                  {newPoll.poll_type === "quiz" &&
                    "(Select one as correct answer below)"}
                </FormLabel>
                {newPoll.options.map((opt, idx) => (
                  <TextField
                    key={idx}
                    fullWidth
                    label={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...newPoll.options];
                      newOpts[idx] = e.target.value;
                      setNewPoll({ ...newPoll, options: newOpts });
                    }}
                    margin="normal"
                    error={!!validationErrors.options && idx === 0}
                    helperText={idx === 0 && validationErrors.options}
                    disabled={isSubmitting}
                    sx={{
                      "& label": { color: "#B0E0F0" },
                      "& input": { color: "white" },
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                        "&:hover fieldset": { borderColor: COLORS.info },
                      },
                    }}
                  />
                ))}
                <Button
                  size="small"
                  onClick={() =>
                    setNewPoll({
                      ...newPoll,
                      options: [...newPoll.options, ""],
                    })
                  }
                  disabled={isSubmitting}
                  sx={{ color: COLORS.info, textTransform: "none" }}
                >
                  + Add Option
                </Button>
              </>
            )}
            {newPoll.poll_type === "quiz" && (
              <TextField
                select
                fullWidth
                label="✅ Correct Answer"
                value={newPoll.correct_answer}
                onChange={(e) =>
                  setNewPoll({ ...newPoll, correct_answer: e.target.value })
                }
                margin="normal"
                error={!!validationErrors.correct_answer}
                helperText={validationErrors.correct_answer}
                disabled={isSubmitting}
                sx={{
                  "& label": { color: "#B0E0F0" },
                  "& .MuiSelect-root": { color: "white" },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover fieldset": { borderColor: COLORS.info },
                  },
                }}
              >
                {newPoll.options
                  .filter((opt) => opt.trim())
                  .map((opt, idx) => (
                    <MenuItem key={idx} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
              </TextField>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenCreate(false);
                resetPollForm();
              }}
              sx={{ color: "#B0E0F0", textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePoll}
              variant="contained"
              disabled={isSubmitting}
              sx={{
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                textTransform: "none",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
                },
                transition: "all 0.2s",
              }}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Vote Dialog */}
        <Dialog
          open={openVote}
          onClose={() => {
            if (!isSubmitting) {
              setOpenVote(false);
              setSelectedAnswer("");
              setFeedback("");
            }
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 5,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)"
                  : "linear-gradient(145deg, #0f3a5f 0%, #0a2a44 100%)",
              border: `1px solid ${alpha("#fff", 0.2)}`,
            },
          }}
        >
          <DialogTitle
            sx={{ color: "white", fontSize: "1.5rem", fontWeight: 700 }}
          >
            {selectedPoll?.title}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                background: "rgba(255,255,255,0.08)",
                p: 2,
                borderRadius: 3,
                mb: 3,
                borderLeft: `4px solid ${selectedPoll?.poll_type === "quiz" ? COLORS.warning : selectedPoll?.poll_type === "rating" ? COLORS.secondary : COLORS.primary}`,
              }}
            >
              <Typography variant="body1" sx={{ color: "#B0E0F0" }}>
                📝 {selectedPoll?.description}
              </Typography>
            </Box>
            {selectedPoll?.expires_at && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                This poll expires on {formatExpiryDate(selectedPoll.expires_at)}
              </Alert>
            )}
            {selectedPoll?.poll_type === "rating" ? (
              <>
                <TextField
                  select
                  fullWidth
                  label="Rating"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  margin="normal"
                  sx={{
                    "& label": { color: "#B0E0F0" },
                    "& .MuiSelect-root": { color: "white" },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                      "&:hover fieldset": { borderColor: COLORS.info },
                    },
                  }}
                >
                  <MenuItem value="1">⭐ 1 Star</MenuItem>
                  <MenuItem value="2">⭐⭐ 2 Stars</MenuItem>
                  <MenuItem value="3">⭐⭐⭐ 3 Stars</MenuItem>
                  <MenuItem value="4">⭐⭐⭐⭐ 4 Stars</MenuItem>
                  <MenuItem value="5">⭐⭐⭐⭐⭐ 5 Stars</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  label="Feedback (optional)"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  margin="normal"
                  multiline
                  rows={2}
                  placeholder="Share your thoughts..."
                  sx={{
                    "& label": { color: "#B0E0F0" },
                    "& textarea": { color: "white" },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                      "&:hover fieldset": { borderColor: COLORS.info },
                    },
                  }}
                />
              </>
            ) : (
              <>
                <RadioGroup
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                >
                  {selectedPoll?.options?.map((opt, idx) => (
                    <FormControlLabel
                      key={idx}
                      value={opt}
                      control={<Radio sx={{ color: COLORS.info }} />}
                      label={<span style={{ color: "white" }}>{opt}</span>}
                    />
                  ))}
                </RadioGroup>
                <TextField
                  fullWidth
                  label="Feedback (optional)"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  margin="normal"
                  multiline
                  rows={2}
                  placeholder="Share your thoughts..."
                  sx={{
                    "& label": { color: "#B0E0F0" },
                    "& textarea": { color: "white" },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                      "&:hover fieldset": { borderColor: COLORS.info },
                    },
                  }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenVote(false);
                setSelectedAnswer("");
                setFeedback("");
              }}
              sx={{ color: "#B0E0F0", textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVote}
              variant="contained"
              disabled={isSubmitting}
              sx={{
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                textTransform: "none",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
                },
              }}
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={notification.open}
          autoHideDuration={3000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity={notification.type}
            variant="filled"
            sx={{
              borderRadius: 3,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              fontWeight: 600,
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

// Main Dashboard with Theme Provider and Error Boundary
export default function Dashboard({ user, onLogout }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem("themeMode") || "light",
  );
  
  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prev) => {
          const newMode = prev === "light" ? "dark" : "light";
          localStorage.setItem("themeMode", newMode);
          return newMode;
        });
      },
    }),
    [mode],
  );
  
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  return (
    <ErrorBoundary>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <DashboardContent user={user} onLogout={onLogout} />
        </ThemeProvider>
      </ColorModeContext.Provider>
    </ErrorBoundary>
  );
}
import React, { useState, useEffect, useRef, useContext } from 'react';
import Head from "next/head";
import { useRouter } from 'next/router';
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import { 
  Button, 
  Box, 
  Typography, 
  TextField,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from "@mui/material";
import { 
  Send as SendIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Lightbulb as LightbulbIcon,
  Chat as ChatIcon,
  ContentCopy as CopyIcon
} from "@mui/icons-material";
import SBRContext from "../context/SBRContext";
import { Toaster, toast } from "react-hot-toast";

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens?: number;
  created_at: string;
}

interface Session {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Idea {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

const SmartPilotPage = () => {
  const router = useRouter();
  const { isLoaded, user, isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { admin } = context;

  // Redirect non-signed-in users
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/ads');
    }
  }, [isLoaded, isSignedIn, router]);

  // Load sessions on mount
  useEffect(() => {
    if (isSignedIn && user?.emailAddresses[0]?.emailAddress) {
      loadSessions();
    }
  }, [isSignedIn, user]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
      loadIdeas(currentSessionId);
    } else {
      setMessages([]);
      setIdeas([]);
    }
  }, [currentSessionId]);

  // Handle seed parameter
  useEffect(() => {
    if (router.query.seed && typeof router.query.seed === 'string') {
      setMessageInput(router.query.seed);
    }
  }, [router.query.seed]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/smart-pilot/sessions', {
        headers: {
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadMessages = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/smart-pilot/messages?sessionId=${sessionId}`, {
        headers: {
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadIdeas = async (sessionId: number) => {
    if (!user?.emailAddresses[0]?.emailAddress) return;
    
    try {
      const response = await fetch(`/api/smart-pilot/ideas?sessionId=${sessionId}`, {
        headers: {
          'x-user-email': user.emailAddresses[0].emailAddress
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas);
      }
    } catch (error) {
      console.error('Error loading ideas:', error);
    }
  };

  const createNewSession = async (title?: string) => {
    try {
      const response = await fetch('/api/smart-pilot/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: JSON.stringify({ title: title || 'New Session' })
      });
      
      if (response.ok) {
        const data = await response.json();
        await loadSessions();
        setCurrentSessionId(data.session.id);
        setShowNewSessionDialog(false);
        setNewSessionTitle('');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');
    setMessageInput('');

    try {
      const response = await fetch('/api/smart-pilot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: message.trim(),
          context: {
            goals: 'General strategy across all tools'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let sessionId = currentSessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setStreamingMessage(prev => prev + data.text);
              } else if (data.sessionId) {
                sessionId = data.sessionId;
                setCurrentSessionId(sessionId);
                await loadSessions(); // Refresh sessions to update titles
              } else if (data.done) {
                // Streaming complete, reload messages
                if (sessionId) {
                  await loadMessages(sessionId);
                }
                setStreamingMessage('');
                setIsStreaming(false);
              } else if (data.error) {
                toast.error(data.error);
                setIsStreaming(false);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAsIdea = async (content: string) => {
    if (!currentSessionId || !user?.emailAddresses[0]?.emailAddress) return;

    const title = content.length > 50 ? content.substring(0, 47) + '...' : content;
    
    try {
      const response = await fetch('/api/smart-pilot/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          title,
          content
        })
      });
      
      if (response.ok) {
        toast.success('Idea saved!');
        await loadIdeas(currentSessionId);
      } else {
        toast.error('Failed to save idea');
      }
    } catch (error) {
      console.error('Error saving idea:', error);
      toast.error('Failed to save idea');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const quickPrompts = [
    { label: 'Domain strategy', prompt: 'Help me choose the best domain name for my business' },
    { label: 'Website optimization', prompt: 'How can I improve my website performance and SEO?' },
    { label: 'Email marketing', prompt: 'Give me email marketing best practices and strategy tips' },
    { label: 'Ads optimization', prompt: 'Help me optimize my Google Ads campaigns for better ROI' },
    { label: 'Cross-tool strategy', prompt: 'How can I integrate all my tools for maximum impact?' }
  ];

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex max-w-7xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Pilot - simplerB</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ duration: 3000 }}
      />

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        {/* Header */}
        <div className="absolute top-4 left-4 flex items-center space-x-3">
          {/* Logo */}
          <div className="flex items-center space-x-0.5">
            <span className="text-gray-800 font-semibold text-lg">simpler</span>
            <div className="w-4 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
          </div>
          
          {/* Tool Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => router.push('/domain')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Domain
            </button>
            <button 
              onClick={() => router.push('/web')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Website
            </button>
            <button 
              onClick={() => router.push('/email')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Email
            </button>
            <button 
              onClick={() => router.push('/ads')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Ads
            </button>
            <button className="px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-800 shadow-sm">
              Pilot
            </button>
          </div>
        </div>

        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            gap: 2,
            alignItems: "center",
          }}
        >
          <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
        </Box>

        <h1 className="text-2xl text-gray-900 mb-8 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Pilot</span>
        </h1>

        <div className="w-full max-w-7xl mx-auto flex gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="w-80 bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-4 flex flex-col">
            {/* Sessions */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <Typography variant="h6" className="flex items-center gap-2">
                  <ChatIcon fontSize="small" />
                  Sessions
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setShowNewSessionDialog(true)}
                  className="bg-blue-50 hover:bg-blue-100"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </div>
              
              <List dense className="max-h-48 overflow-y-auto">
                {sessions.map((session) => (
                  <ListItem
                    key={session.id}
                    button
                    selected={currentSessionId === session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className="rounded-lg mb-1"
                  >
                    <ListItemText
                      primary={session.title}
                      secondary={`${session.message_count} messages`}
                      primaryTypographyProps={{ fontSize: '0.875rem', noWrap: true }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            </div>

            <Divider className="my-4" />

            {/* Ideas */}
            <div className="flex-1">
              <Typography variant="h6" className="flex items-center gap-2 mb-3">
                <LightbulbIcon fontSize="small" />
                Saved Ideas
              </Typography>
              
              <List dense className="max-h-48 overflow-y-auto">
                {ideas.map((idea) => (
                  <ListItem key={idea.id} className="rounded-lg mb-1">
                    <ListItemText
                      primary={idea.title}
                      secondary={new Date(idea.created_at).toLocaleDateString()}
                      primaryTypographyProps={{ fontSize: '0.875rem', noWrap: true }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        size="small"
                        onClick={() => copyToClipboard(idea.content)}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 bg-white rounded-2xl border-2 border-gray-200 shadow-sm flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !isStreaming && (
                <div className="text-center py-12">
                  <Typography variant="h6" color="textSecondary" className="mb-4">
                    Start a conversation with Pilot
                  </Typography>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickPrompts.map((prompt, index) => (
                      <Chip
                        key={index}
                        label={prompt.label}
                        onClick={() => sendMessage(prompt.prompt)}
                        className="cursor-pointer hover:bg-blue-50"
                      />
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card
                    className={`max-w-3xl ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50'
                    }`}
                  >
                    <CardContent className="pb-3">
                      <Typography variant="body2" className="whitespace-pre-wrap">
                        {message.content}
                      </Typography>
                      {message.role === 'assistant' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LightbulbIcon />}
                            onClick={() => saveAsIdea(message.content)}
                          >
                            Save Idea
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CopyIcon />}
                            onClick={() => copyToClipboard(message.content)}
                          >
                            Copy
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-3xl bg-gray-50">
                    <CardContent className="pb-3">
                      <Typography variant="body2" className="whitespace-pre-wrap">
                        {streamingMessage}
                        <span className="animate-pulse">▋</span>
                      </Typography>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t">
              <div className="flex gap-2">
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(messageInput);
                    }
                  }}
                  placeholder="Ask Pilot anything about domains, websites, emails, or ads..."
                  disabled={isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => sendMessage(messageInput)}
                          disabled={!messageInput.trim() || isLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </div>
              
              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-2 mt-3">
                {quickPrompts.map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt.label}
                    onClick={() => setMessageInput(prompt.prompt)}
                    size="small"
                    className="cursor-pointer hover:bg-blue-50"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* New Session Dialog */}
        <Dialog 
          open={showNewSessionDialog} 
          onClose={() => setShowNewSessionDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Session</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Session Title"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createNewSession(newSessionTitle);
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowNewSessionDialog(false)}>Cancel</Button>
            <Button onClick={() => createNewSession(newSessionTitle)} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </main>
    </div>
  );
};

export default SmartPilotPage;

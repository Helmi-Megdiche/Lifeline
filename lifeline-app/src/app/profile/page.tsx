"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/ClientAuthContext";
import { API_CONFIG } from "@/lib/config";
import { useRouter } from "next/navigation";

const getEmergencyDetectionKey = (userId?: string) => {
  return userId ? `lifeline:emergencyDetectionEnabled:${userId}` : 'lifeline:emergencyDetectionEnabled';
};

export default function ProfilePage() {
  const { user, token, logout, forgotPassword } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [emergencyDetectionEnabled, setEmergencyDetectionEnabled] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
  });

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: "",
      });
      
      // Load emergency detection setting - user-specific
      const EMERGENCY_DETECTION_KEY = getEmergencyDetectionKey(user.id);
      const saved = localStorage.getItem(EMERGENCY_DETECTION_KEY);
      if (saved !== null) {
        setEmergencyDetectionEnabled(JSON.parse(saved));
      } else {
        // Default to false if no setting found for this user
        setEmergencyDetectionEnabled(false);
      }
    } else {
      // Reset when user logs out
      setEmergencyDetectionEnabled(false);
    }
  }, [user]);
  
  const handleToggleEmergencyDetection = async () => {
    if (!user?.id) return;
    
    const newValue = !emergencyDetectionEnabled;
    setEmergencyDetectionEnabled(newValue);
    const EMERGENCY_DETECTION_KEY = getEmergencyDetectionKey(user.id);
    localStorage.setItem(EMERGENCY_DETECTION_KEY, JSON.stringify(newValue));
    
    // Dispatch custom event for same-origin updates
    window.dispatchEvent(new CustomEvent('emergency-detection-changed'));
    
    // Request notification permission if enabling
    if (newValue && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    // Request microphone permission if enabling
    if (newValue) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('Microphone permission denied:', err);
        alert('Microphone permission is required for emergency detection. Please enable it in your browser settings.');
        setEmergencyDetectionEnabled(false);
        if (user?.id) {
          const EMERGENCY_DETECTION_KEY = getEmergencyDetectionKey(user.id);
          localStorage.setItem(EMERGENCY_DETECTION_KEY, JSON.stringify(false));
        }
        window.dispatchEvent(new CustomEvent('emergency-detection-changed'));
      }
    }
  };

  // Fetch user email from backend if available
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!token || !user?.id) return;
      
      try {
        setIsLoading(true);
        // Note: You may need to create a GET /auth/profile endpoint to fetch full user data
        // For now, we'll try to get it from the update response or use localStorage
        const storedUser = localStorage.getItem('lifeline:user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.email) {
            setUserEmail(parsed.email);
            setFormData(prev => ({ ...prev, email: parsed.email }));
          }
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserEmail();
  }, [token, user]);

  const handleSave = async () => {
    if (!token || !user) {
      setError("You must be logged in to update your profile");
      return;
    }

    if (!formData.username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email cannot be empty");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update profile" }));
        throw new Error(errorData.message || "Failed to update profile");
      }

      const data = await response.json();
      
      // Update local storage with new user data (include email for consistency)
      const updatedUser = { id: user.id, username: data.user.username, email: formData.email.trim() };
      localStorage.setItem("lifeline:user", JSON.stringify(updatedUser));

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError(error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const targetEmail = (formData.email || userEmail || user?.email || '').trim();
      if (!targetEmail) {
        alert('No email found on your account. Please add your email first.');
        return;
      }
      await forgotPassword(targetEmail);
      alert('Password reset email sent. Please check your inbox.');
    } catch (e: any) {
      alert(e?.message || 'Failed to send reset email');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || "",
      email: userEmail || "",
    });
    setError(null);
    setSuccess(null);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await logout();
      router.push("/auth");
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/70 dark:bg-dark-surface-primary/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-dark-border-primary/60 p-8 text-center shadow-lg">
          <div className="text-gray-400 dark:text-dark-text-tertiary text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">Not Logged In</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">Please log in to view your profile.</p>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <span>🔐</span>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-white text-2xl">👤</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-dark-text-primary dark:to-dark-text-secondary bg-clip-text text-transparent mb-3">
          My Profile
        </h1>
        <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
          Manage your account information and settings.
        </p>
      </div>

      <div className="bg-white/80 dark:bg-dark-surface-primary/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-dark-border-primary/60 p-8 shadow-lg">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-green-700 dark:text-green-400 font-medium">✓ {success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-400 font-medium">✗ {error}</p>
          </div>
        )}

        {/* User Info Display */}
        {!isEditing ? (
          <div className="space-y-6">
            <div className="bg-gray-50/50 dark:bg-dark-surface-secondary/50 rounded-xl p-4 border border-gray-200/60 dark:border-dark-border-primary/60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white text-xl font-bold">
                      {user.username?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                      {user.username}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Username</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 dark:bg-dark-surface-secondary/50 rounded-xl p-4 border border-gray-200/60 dark:border-dark-border-primary/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
                    User ID
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary font-mono">
                    {user.id}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 dark:bg-dark-surface-secondary/50 rounded-xl p-4 border border-gray-200/60 dark:border-dark-border-primary/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
                    Email
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary break-all">
                    {userEmail || user?.email || 'Not set'}
                  </p>
                </div>
                <button
                  onClick={handleForgotPassword}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                >
                  Forgot password
                </button>
              </div>
            </div>

            {/* Emergency Detection Toggle */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border-2 border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🚨</span>
                    <h3 className="text-lg font-bold text-black dark:text-white">
                      Emergency Voice Detection
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-black dark:text-gray-300 mb-2 leading-relaxed">
                    Automatically detects screams or emergency keywords ("help", "SOS") and creates alerts
                  </p>
                  <p className={`text-xs font-semibold ${
                    emergencyDetectionEnabled 
                      ? 'text-green-700 dark:text-green-400' 
                      : 'text-gray-700 dark:text-gray-400'
                  }`}>
                    {emergencyDetectionEnabled 
                      ? '✅ Active - Listening for emergencies' 
                      : '⚠️ Inactive - Manual recording only'}
                  </p>
                </div>
                <button
                  onClick={handleToggleEmergencyDetection}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    emergencyDetectionEnabled 
                      ? 'bg-red-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label="Toggle emergency detection"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      emergencyDetectionEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                ✏️ Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium rounded-xl transition-colors duration-200"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface-secondary border border-gray-300 dark:border-dark-border-primary rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface-secondary border border-gray-300 dark:border-dark-border-primary rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                disabled={isSaving}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
              >
                {isSaving ? "💾 Saving..." : "💾 Save Changes"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-900 dark:text-gray-100 font-medium rounded-xl transition-colors duration-200 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


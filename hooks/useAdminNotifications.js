import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const useAdminNotifications = (userId) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestTicket, setLatestTicket] = useState(null)
  const [showNotification, setShowNotification] = useState(false)
  const audioRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    // Initialize audio for notification sound
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification.mp3')
      audioRef.current.volume = 0.5
    }

    // Load initial unread count
    loadUnreadCount()

    // Subscribe to new support tickets
    subscribeToNewTickets()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId])

  const loadUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      if (!error) {
        setUnreadCount(count || 0)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const subscribeToNewTickets = () => {
    // Create a channel for real-time updates
    const channel = supabase
      .channel('admin-support-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets'
        },
        async (payload) => {
          console.log('🔔 New support ticket received:', payload.new)
          
          // Fetch user details for the notification
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, user_type')
            .eq('id', payload.new.user_id)
            .single()

          const ticketData = {
            ...payload.new,
            user: userData
          }

          setLatestTicket(ticketData)
          setUnreadCount(prev => prev + 1)
          setShowNotification(true)

          // Play notification sound
          playNotificationSound()

          // Auto-hide notification after 5 seconds
          setTimeout(() => {
            setShowNotification(false)
          }, 5000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          // Update count when ticket status changes
          if (payload.old.status !== payload.new.status) {
            loadUnreadCount()
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err)
      })
    }
  }

  const dismissNotification = () => {
    setShowNotification(false)
  }

  const refreshCount = () => {
    loadUnreadCount()
  }

  return {
    unreadCount,
    latestTicket,
    showNotification,
    dismissNotification,
    refreshCount
  }
}

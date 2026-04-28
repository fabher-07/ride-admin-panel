import { supabase } from '@/lib/supabase';

export const getActiveRewards = async () => {
  try {
    const { data, error } = await supabase
      .from('driver_rewards')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { rewards: data, error: null };
  } catch (error) {
    console.error('Error fetching active rewards:', error);
    return { rewards: [], error };
  }
};

export const createReward = async (rewardData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('driver_rewards')
      .insert({
        ...rewardData,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return { reward: data, error: null };
  } catch (error) {
    console.error('Error creating reward:', error);
    return { reward: null, error };
  }
};

export const updateReward = async (rewardId, updates) => {
  try {
    const { data, error } = await supabase
      .from('driver_rewards')
      .update(updates)
      .eq('id', rewardId)
      .select()
      .single();

    if (error) throw error;
    return { reward: data, error: null };
  } catch (error) {
    console.error('Error updating reward:', error);
    return { reward: null, error };
  }
};

export const deleteReward = async (rewardId) => {
  try {
    const { error } = await supabase
      .from('driver_rewards')
      .delete()
      .eq('id', rewardId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting reward:', error);
    return { error };
  }
};

export const assignRewardToDriver = async (driverId, rewardId, notes = null, expiresAt = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('driver_reward_assignments')
      .insert({
        driver_id: driverId,
        reward_id: rewardId,
        assigned_by: user?.id,
        notes,
        expires_at: expiresAt,
        status: 'active'
      })
      .select(`
        *,
        reward:driver_rewards(*)
      `)
      .single();

    if (error) throw error;
    return { assignment: data, error: null };
  } catch (error) {
    console.error('Error assigning reward to driver:', error);
    return { assignment: null, error };
  }
};

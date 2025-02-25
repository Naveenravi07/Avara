'use client';
import Cookie from 'js-cookie';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from './../types/user/user';

const getUserData = async () => {
  console.log('Cookie = ' + Cookie.get('x-auth-cookie'));
  const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    console.error('Failed to fetch user data:', response.statusText);
    throw new Error('Failed to fetch user data');
  }
  const data = await response.json();
  console.log('Fetched user data:', data);
  return data?.data;
};

const handleLogout = async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/logout`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    console.error('Failed to logout user ', response.statusText);
  } else {
    const data = await response.json();
    Cookie.remove('x-auth-cookie');
    console.log('logout success', data);
  }
};

const useAuth = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user'],
    queryFn: getUserData,
    enabled: Boolean(Cookie.get('x-auth-cookie')),
    retry: false,
  });
  const { data, error, isLoading, isError, isFetching } = query;
  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  return {
    user: data as User | undefined,
    error,
    isLoading,
    isError,
    isFetching,
    invalidate: invalidateUser,
    logout: handleLogout,
  };
};

export default useAuth;

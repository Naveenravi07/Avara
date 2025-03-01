'use client';
import { useState, useEffect } from 'react';
import useAuth from '@/hooks/useAuth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LogOut, Settings, User } from 'lucide-react';
import logo from "../../public/logo2.png"
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';

export default function Navbar() {
    const { user, logout, invalidate, isError } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        // Set loading to false once we have determined the auth state
        // This assumes useAuth hook eventually resolves to a state
        if (user !== undefined || isError) {
            setIsLoading(false);
        }
    }, [user, isError]);

    const handleLogout = async () => {
        await logout();
        invalidate();
    };

    return (
        <nav className="flex items-center justify-between p-4 bg-background">
            <div className="text-2xl font-bold">
                <a href="/" className="text-primary hover:text-primary/80">
                    <Image alt='AVARA LOGO' src={logo} height={20} width={100} />
                </a>
            </div>
            {isLoading ? (
                // Loading state
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            ) : user && !isError ? (
                // Authenticated state
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={user?.pfpUrl || '/placeholder.svg?height=32&width=32'}
                                    alt={`${user?.name}'s avatar`}
                                />
                                <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                // Unauthenticated state
                <div className="flex gap-2">
                    <Button variant="ghost" asChild>
                        <a href="/auth/login">Login</a>
                    </Button>
                    <Button asChild>
                        <a href="/auth/signup">Register</a>
                    </Button>
                </div>
            )}
        </nav>
    );
}


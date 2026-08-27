"use client"

import { useState } from "react"
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth0 } from "@auth0/auth0-react"
import AuthModal from "@/components/AuthModal"
import "./header.css"

type Props = {
    battleMode: "singles" | "doubles"
    setBattleMode: (mode: "singles" | "doubles") => void
    sidebarOpen: boolean
    setSidebarOpen: (sidebar: boolean) => void
}

export default function Header({ battleMode, setBattleMode, sidebarOpen, setSidebarOpen }: Props) {
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const { isAuthenticated, isLoading, user, logout } = useAuth0();

    return (
        <>
            <div className="header-bar">
                <Button variant="outline" size="sm" className="relative z-[60]" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    ☰ Tools
                </Button>

                <h1 className="header-title">
                    Pokemon Battle Simulator!!
                </h1>

                <div className="header-auth-section">
                    {!isLoading && !isAuthenticated && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setAuthModalOpen(true)}
                            className="header-login-button"
                            data-testid="header-login-button"
                        >
                            Log In
                        </Button>
                    )}
                    {!isLoading && isAuthenticated && (
                        <>
                            {user?.picture && (
                                <img
                                    src={user.picture}
                                    alt={user.name ?? 'User avatar'}
                                    className="header-avatar"
                                />
                            )}
                            <span className="header-username">
                                {user?.name}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                                className="header-logout-button"
                            >
                                Log Out
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="header-battle-mode-row">
                <Tabs value={battleMode} onValueChange={(v) => setBattleMode(v as "singles" | "doubles")}>
                    <TabsList className="header-battle-mode-tabs">
                        <TabsTrigger value="singles">Singles</TabsTrigger>
                        <TabsTrigger value="doubles">Doubles</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        </>
    );
}

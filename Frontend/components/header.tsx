"use client"

import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth0 } from "@auth0/auth0-react"
import "./header.css"

type Props = {
    battleMode: any
    setBattleMode: (mode: any) => void
    setSidebarOpen: (sidebar: any) => void
}

export default function Header({ battleMode, setBattleMode, setSidebarOpen }: Props) {
    const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();

    return (
        <>
            <div className="header-bar">
                <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
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
                            onClick={() => loginWithRedirect()}
                            className="header-login-button"
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
        </>
    );
}

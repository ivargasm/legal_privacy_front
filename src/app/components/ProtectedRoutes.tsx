"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/Store";
import SessionWatcher from "./SessionWatcher";
import Loader from "./Loader";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { userAuth, userValid, isLoading } = useAuthStore();
    const [verifiedOnce, setVerifiedOnce] = useState(false);

    useEffect(() => {
        let active = true;
        const checkAuth = async () => {
            await userValid();
            if (!active) return;
            setVerifiedOnce(true);
            if (!useAuthStore.getState().userAuth) {
                router.replace("/auth/login");
            }
        };
        checkAuth();
        return () => {
            active = false;
        };
    }, [router, userValid]);

    if (!verifiedOnce || isLoading) {
        return <Loader />;
    }

    return userAuth ? (
        <>
            {children}
            <SessionWatcher />
        </>
    ) : null;
}

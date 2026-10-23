"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/Store";
import SessionWatcher from "./SessionWatcher";
import Loader from "./Loader";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { userAuth, userValid, isLoading } = useAuthStore();

    useEffect(() => {
        const checkAuth = async () => {
            await userValid();
            if (!useAuthStore.getState().userAuth) {
                router.push("/auth/login");
            }
        };
        checkAuth();
    }, [router, userValid]);

    if (isLoading) {
        return <Loader />;
    }

    return userAuth ? (
        <>
            {children}
            <SessionWatcher />
        </>
    ) : null;
}
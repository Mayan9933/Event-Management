import React,{createContext,useContext,useEffect,useState} from 'react';
import {api} from '../services/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const token=localStorage.getItem('iiita_token');if(!token){setLoading(false);return;}
  api('/auth/me').then(r=>setUser(r.user)).catch(()=>localStorage.removeItem('iiita_token')).finally(()=>setLoading(false));
 },[]);
 const login=async(credentials)=>{const r=await api('/auth/login',{method:'POST',body:JSON.stringify(credentials)});localStorage.setItem('iiita_token',r.token);setUser(r.user);return r.user;};
 const logout=()=>{localStorage.removeItem('iiita_token');setUser(null);};
 return <AuthContext.Provider value={{user,loading,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);

import styles from '../styles/Profile.module.css';

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';

export default function ProfilePage() {
  const [mode, setMode] = useState<'initial' | 'login' | 'create'>('initial');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const user = await AsyncStorage.getItem('user');
    if (user) {
      setIsLoggedIn(true);
      setUsername(JSON.parse(user).username);
    }
  };

  const handleLogin = async () => {
    try {
      const formData = new FormData();
      
      formData.append('username', username);
      formData.append('password', password);
      
      const uploadResponse = await fetch('/login', {
        method: 'POST',
        body: formData
      });
      
      const response = await uploadResponse.json();
      
      if (response.success) {
        await AsyncStorage.setItem('user', JSON.stringify({ username }));
        setIsLoggedIn(true);
        setError(null);
      } else {
        setError(`Login failed: ${response.message}`);
      }
      
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const handleCreateAccount = async () => {
    try {
      const formData = new FormData();
      
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      formData.append('username', username);
      formData.append('password', hash);
      
      const uploadResponse = await fetch('/createaccount', {
        method: 'POST',
        body: formData
      });
      
      const response = await uploadResponse.json();
      
      if (response.success) {
        await AsyncStorage.setItem('user', JSON.stringify({ username }));
        setIsLoggedIn(true);
        setError(null);
      } else {
        setError(`Account creation failed: ${response.message}`);
      }
      
    } catch (err) {
      setError('Account creation failed. Please try again.');
    }
  };
  
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setIsLoggedIn(false);
      setError(null);
      setMode('initial');
    } catch (err) {
      setError('Logout failed. Please try again.');
    }
  };

  if (isLoggedIn) {
    return (
      <div className={styles.container}>
        <Text className={styles.title}>Welcome, {username}!</Text>
        <View className={styles.buttonContainer}>
          <Button title="Logout" onPress={handleLogout}/>
        </View>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {mode === 'initial' ? (
        <div>
          <View className={styles.buttonContainer}>
            <Button title="Login" onPress={() => setMode('login')}/>
          </View>
          <View className={styles.buttonContainer}>
            <Button title="Create Account" onPress={() => setMode('create')}/>
          </View>
        </div>
      ) : (
        <div>
          <div>
            <TextInput
              className={styles.placeholderText}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
            />
          </div>
          <div>
            <TextInput
              className={styles.placeholderText}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </div>
          <View className={styles.buttonContainer}>
            <Button title={mode === 'login' ? 'Login' : 'Create Account'} onPress={mode === 'login' ? handleLogin : handleCreateAccount}/>
          </View>
          {error && <Text className={styles.errorText}>{error}</Text>}
        </div>
      )}
    </div>
  );
}

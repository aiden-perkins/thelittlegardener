import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, TouchableHighlight } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/Profile.module.css';

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
      
      const uploadResponse = await fetch('/api/login', {
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
      
      formData.append('username', username);
      formData.append('password', password);
      
      const uploadResponse = await fetch('/api/createaccount', {
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
        <div className={styles.profileWrapper}>
          <Image source={require('../../assets/images/defaultprofile.jpg')}
              style={profileStyles.profileImage}/>
          <div>
            <div className={styles.title}>{username}</div>
            <Text>Plants: 0</Text>
          </div>
        </div>
        <View className={styles.buttonContainer}>
          <TouchableHighlight style={profileStyles.buttonContainerGreen}  onPress={handleLogout}>
              <Text style={profileStyles.buttonText}>Log out</Text>
          </TouchableHighlight>
        </View>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {mode === 'initial' ? (
        <div>
          <div className={styles.title}>Welcome to The Little Gardener!</div>
          <div className={styles.buttonContainer}>
            <TouchableHighlight onPress={() => setMode('login')} style={profileStyles.buttonContainerGreen}>
              <Text style={profileStyles.buttonText}>Log in</Text>
            </TouchableHighlight>
          </div>
          <div className={styles.buttonContainer}>
            <TouchableHighlight onPress={() => setMode('create')} style={profileStyles.buttonContainer}>
              <Text style={profileStyles.buttonText}>I'm a new gardener!</Text>
            </TouchableHighlight>
          </div>
        </div>
      ) : (
        <div>
          <div>
            <TextInput
              className={styles.placeholderText}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              style={profileStyles.inputField}
            />
          </div>
          <div>
            <TextInput
              className={styles.placeholderText}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={profileStyles.inputField}
            />
          </div>
          <View className={styles.buttonContainer}>
            <TouchableHighlight onPress={mode === 'login' ? handleLogin : handleCreateAccount} style={profileStyles.buttonContainerGreen}>
              <Text style={profileStyles.buttonText}>{mode === 'login' ? 'Login' : 'Create Account'}</Text>
            </TouchableHighlight>
          </View>
          {error && <Text className={styles.errorText}>{error}</Text>}
        </div>
      )}
    </div>
  );
}

const profileStyles = StyleSheet.create({
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 100
  },
  buttonContainer: {
    backgroundColor: '#F1EB91',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainerGreen: {
    backgroundColor: '#BBEA9B',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  inputField: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 12,
    borderColor: '#D9D9D9',
    borderWidth: 1,
    borderRadius: 100
  }
})
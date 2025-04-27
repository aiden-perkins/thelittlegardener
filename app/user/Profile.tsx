import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, TouchableHighlight } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/lib/config';
import Svg, { Path } from 'react-native-svg';

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
      
      const uploadResponse = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        body: formData
      });
      
      const response = await uploadResponse.json();
      
      if (response.success) {
        await AsyncStorage.setItem('user', JSON.stringify({ username }));
        await AsyncStorage.setItem('triggerGardenRefresh', 'true');
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
      
      const uploadResponse = await fetch(`${API_BASE_URL}/api/createaccount`, {
        method: 'POST',
        body: formData
      });
      
      const response = await uploadResponse.json();
      
      if (response.success) {
        await AsyncStorage.setItem('user', JSON.stringify({ username }));
        await AsyncStorage.setItem('triggerGardenRefresh', 'true');
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
      <View style={profileStyles.container}>
        <View style={profileStyles.profileWrapper}>
          <Image source={require('../../assets/images/defaultprofile.jpg')}
              style={profileStyles.profileImage}/>
          <View>
            <Text style={profileStyles.title}>{username}</Text>
            <Text style={profileStyles.text}>Plants: 0</Text>
          </View>
        </View>
        <View style={profileStyles.buttonContainer}>
          <TouchableHighlight style={profileStyles.buttonContainerGreen}  onPress={handleLogout}>
              <Text style={profileStyles.buttonText}>Log out</Text>
          </TouchableHighlight>
        </View>
        {/* background deco! */}
        {/* planet */}
        <Svg width="400" height="400" viewBox="0 0 561 564" fill="none" style={profileStyles.planet}>
          <Path d="M377.834 10.1133L377.764 10.335C377.387 11.7797 375.418 19.9531 376.919 27.9238C377.863 32.9391 380.042 37.0003 381.736 39.5625C399.631 47.6788 416.419 57.8055 431.813 69.6543C435.563 70.6392 445.479 72.6536 456.525 70.0342C470.591 66.6989 482.25 56.9802 482.254 56.9766L518.096 97.2451L517.814 97.4951C516.098 99.194 506.617 108.943 502.13 121.271C497.199 134.82 499.899 147.424 499.914 147.494L497.523 144.809C518.962 182.105 531.224 225.348 531.224 271.455C531.224 281.169 530.678 290.756 529.618 300.187C531.012 303.882 534.077 310.393 539.859 315.968C548.497 324.294 560.513 328.077 560.518 328.078L548.47 371.17L548.17 371.086C546.214 370.649 535.153 368.4 524.53 370.796C516.519 372.603 510.43 376.721 507.385 379.14C497.294 400.718 484.263 420.646 468.81 438.411C468.908 441.1 469.381 444.599 470.795 448.331C473.857 456.414 480.343 463.158 480.375 463.191L460.386 483.547L460.22 483.385C459.109 482.389 452.763 476.882 445.36 474.23C440.227 472.392 435.559 472.302 432.805 472.487C430.125 474.571 427.403 476.601 424.64 478.578C422.805 482.152 420.136 488.608 419.823 496.388C419.342 508.353 424.48 519.825 424.501 519.873L384.295 539.506L384.158 539.226C383.185 537.474 377.515 527.713 368.666 521.367C362.86 517.204 356.713 515.289 352.69 514.422C328.7 521.915 303.183 525.955 276.724 525.955C270.938 525.955 265.197 525.76 259.508 525.38C255.407 526.85 246.719 530.64 239.431 538.36C229.507 548.871 225.1 563.395 225.099 563.4L173.032 549.426L173.13 549.063C173.631 546.701 176.202 533.347 173.183 520.579C170.517 509.308 164.068 501.25 161.609 498.491C103.685 469.063 58.5293 418.122 36.668 356.184C34.2185 353.64 30.9851 350.857 27.1729 348.919C18.3012 344.409 9.00735 345.742 9.00391 345.742L0 298.681L0.228516 298.638C1.67218 298.246 9.74392 295.815 15.7158 289.039C18.8713 285.458 20.968 281.165 22.2979 277.667C22.2484 275.602 22.2236 273.532 22.2236 271.455C22.2236 201.708 50.2794 138.512 95.7227 92.542L94.8369 93.1738C94.8769 93.0881 99.3774 83.4035 97.8994 71.5488C96.4149 59.6434 89.4459 49.1484 89.4434 49.1445L125.898 23.2012L126.079 23.4551C127.326 25.0244 134.515 33.7262 144.283 38.5391C153.251 42.9577 162.155 42.9199 164.877 42.7852C198.635 26.2423 236.595 16.9551 276.724 16.9551C293.573 16.9551 310.04 18.5933 325.975 21.7178C328.833 20.5966 332.894 18.5513 336.514 15.0557C342.931 8.85771 346.067 0.0322774 346.078 0L377.834 10.1133Z" fill="#D9D9D9"/>
        </Svg>
        {/* stars */}
        <Svg width="50" height="50" viewBox="0 0 50 50" fill="none" style={profileStyles.star1}>
          <Path d="M23.1243 2.069C23.7686 0.327768 26.2314 0.327775 26.8757 2.06901L32.2434 16.575C32.446 17.1224 32.8776 17.554 33.425 17.7566L47.931 23.1243C49.6722 23.7686 49.6722 26.2314 47.931 26.8757L33.425 32.2434C32.8776 32.446 32.446 32.8776 32.2434 33.425L26.8757 47.931C26.2314 49.6722 23.7686 49.6722 23.1243 47.931L17.7566 33.425C17.554 32.8776 17.1224 32.446 16.575 32.2434L2.069 26.8757C0.327768 26.2314 0.327775 23.7686 2.06901 23.1243L16.575 17.7566C17.1224 17.554 17.554 17.1224 17.7566 16.575L23.1243 2.069Z" fill="#FAED74"/>
        </Svg>
        <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={profileStyles.star2}>
          <Path d="M14.5237 1.734C14.8741 -0.523696 18.1259 -0.523687 18.4763 1.734L19.9703 11.3601C20.1039 12.2208 20.7792 12.8961 21.6399 13.0297L31.266 14.5237C33.5237 14.8741 33.5237 18.1259 31.266 18.4763L21.6399 19.9703C20.7792 20.1039 20.1039 20.7792 19.9703 21.6399L18.4763 31.266C18.1259 33.5237 14.8741 33.5237 14.5237 31.266L13.0297 21.6399C12.8961 20.7792 12.2208 20.1039 11.3601 19.9703L1.734 18.4763C-0.523696 18.1259 -0.523687 14.8741 1.734 14.5237L11.3601 13.0297C12.2208 12.8961 12.8961 12.2208 13.0297 11.3601L14.5237 1.734Z" fill="#FAED74"/>
        </Svg>
      </View>
    );
  }

  return (
    <View style={profileStyles.container}>
      {mode === 'initial' ? (
        <View>
          <Text style={profileStyles.title}>Welcome to The Little Gardener!</Text>
          <View style={profileStyles.buttonContainer}>
            <TouchableHighlight onPress={() => setMode('login')} style={profileStyles.buttonContainerGreen}>
              <Text style={profileStyles.buttonText}>Log in</Text>
            </TouchableHighlight>
          </View>
          <View style={profileStyles.buttonContainer}>
            <TouchableHighlight onPress={() => setMode('create')} style={profileStyles.buttonContainerYellow}>
              <Text style={profileStyles.buttonText}>I'm a new gardener!</Text>
            </TouchableHighlight>
          </View>
        </View>
      ) : (
        <View style={profileStyles.inputContainer}>
          <View>
          <View>
            <TextInput
              // style={profileStyles.placeholderText}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              style={profileStyles.inputField}
            />
          </View>
          <View>
            <TextInput
              // style={profileStyles.placeholderText}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={profileStyles.inputField}
            />
          </View>
          </View>
          <View style={profileStyles.buttonContainerRow}>
            <TouchableHighlight onPress={() => setMode('initial')} style={profileStyles.buttonContainerGray}>
              <Ionicons
                name="arrow-back-outline"
                size={24}
                color={"black"}
                style={{'margin': 8}}
                />
            </TouchableHighlight>
            <TouchableHighlight onPress={mode === 'login' ? handleLogin : handleCreateAccount} style={profileStyles.buttonContainerGreen}>
              <Text style={profileStyles.buttonText}>{mode === 'login' ? 'Log in' : 'Create Account'}</Text>
            </TouchableHighlight>
          </View>
          {error && <Text style={profileStyles.errorText}>{error}</Text>}
        </View>
      )}
      {/* background deco! */}
      {/* planet */}
      <Svg width="400" height="400" viewBox="0 0 561 564" fill="none" style={profileStyles.planet}>
        <Path d="M377.834 10.1133L377.764 10.335C377.387 11.7797 375.418 19.9531 376.919 27.9238C377.863 32.9391 380.042 37.0003 381.736 39.5625C399.631 47.6788 416.419 57.8055 431.813 69.6543C435.563 70.6392 445.479 72.6536 456.525 70.0342C470.591 66.6989 482.25 56.9802 482.254 56.9766L518.096 97.2451L517.814 97.4951C516.098 99.194 506.617 108.943 502.13 121.271C497.199 134.82 499.899 147.424 499.914 147.494L497.523 144.809C518.962 182.105 531.224 225.348 531.224 271.455C531.224 281.169 530.678 290.756 529.618 300.187C531.012 303.882 534.077 310.393 539.859 315.968C548.497 324.294 560.513 328.077 560.518 328.078L548.47 371.17L548.17 371.086C546.214 370.649 535.153 368.4 524.53 370.796C516.519 372.603 510.43 376.721 507.385 379.14C497.294 400.718 484.263 420.646 468.81 438.411C468.908 441.1 469.381 444.599 470.795 448.331C473.857 456.414 480.343 463.158 480.375 463.191L460.386 483.547L460.22 483.385C459.109 482.389 452.763 476.882 445.36 474.23C440.227 472.392 435.559 472.302 432.805 472.487C430.125 474.571 427.403 476.601 424.64 478.578C422.805 482.152 420.136 488.608 419.823 496.388C419.342 508.353 424.48 519.825 424.501 519.873L384.295 539.506L384.158 539.226C383.185 537.474 377.515 527.713 368.666 521.367C362.86 517.204 356.713 515.289 352.69 514.422C328.7 521.915 303.183 525.955 276.724 525.955C270.938 525.955 265.197 525.76 259.508 525.38C255.407 526.85 246.719 530.64 239.431 538.36C229.507 548.871 225.1 563.395 225.099 563.4L173.032 549.426L173.13 549.063C173.631 546.701 176.202 533.347 173.183 520.579C170.517 509.308 164.068 501.25 161.609 498.491C103.685 469.063 58.5293 418.122 36.668 356.184C34.2185 353.64 30.9851 350.857 27.1729 348.919C18.3012 344.409 9.00735 345.742 9.00391 345.742L0 298.681L0.228516 298.638C1.67218 298.246 9.74392 295.815 15.7158 289.039C18.8713 285.458 20.968 281.165 22.2979 277.667C22.2484 275.602 22.2236 273.532 22.2236 271.455C22.2236 201.708 50.2794 138.512 95.7227 92.542L94.8369 93.1738C94.8769 93.0881 99.3774 83.4035 97.8994 71.5488C96.4149 59.6434 89.4459 49.1484 89.4434 49.1445L125.898 23.2012L126.079 23.4551C127.326 25.0244 134.515 33.7262 144.283 38.5391C153.251 42.9577 162.155 42.9199 164.877 42.7852C198.635 26.2423 236.595 16.9551 276.724 16.9551C293.573 16.9551 310.04 18.5933 325.975 21.7178C328.833 20.5966 332.894 18.5513 336.514 15.0557C342.931 8.85771 346.067 0.0322774 346.078 0L377.834 10.1133Z" fill="#D9D9D9"/>
      </Svg>
      {/* stars */}
      <Svg width="50" height="50" viewBox="0 0 50 50" fill="none" style={profileStyles.star1}>
        <Path d="M23.1243 2.069C23.7686 0.327768 26.2314 0.327775 26.8757 2.06901L32.2434 16.575C32.446 17.1224 32.8776 17.554 33.425 17.7566L47.931 23.1243C49.6722 23.7686 49.6722 26.2314 47.931 26.8757L33.425 32.2434C32.8776 32.446 32.446 32.8776 32.2434 33.425L26.8757 47.931C26.2314 49.6722 23.7686 49.6722 23.1243 47.931L17.7566 33.425C17.554 32.8776 17.1224 32.446 16.575 32.2434L2.069 26.8757C0.327768 26.2314 0.327775 23.7686 2.06901 23.1243L16.575 17.7566C17.1224 17.554 17.554 17.1224 17.7566 16.575L23.1243 2.069Z" fill="#FAED74"/>
      </Svg>
      <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={profileStyles.star2}>
        <Path d="M14.5237 1.734C14.8741 -0.523696 18.1259 -0.523687 18.4763 1.734L19.9703 11.3601C20.1039 12.2208 20.7792 12.8961 21.6399 13.0297L31.266 14.5237C33.5237 14.8741 33.5237 18.1259 31.266 18.4763L21.6399 19.9703C20.7792 20.1039 20.1039 20.7792 19.9703 21.6399L18.4763 31.266C18.1259 33.5237 14.8741 33.5237 14.5237 31.266L13.0297 21.6399C12.8961 20.7792 12.2208 20.1039 11.3601 19.9703L1.734 18.4763C-0.523696 18.1259 -0.523687 14.8741 1.734 14.5237L11.3601 13.0297C12.2208 12.8961 12.8961 12.2208 13.0297 11.3601L14.5237 1.734Z" fill="#FAED74"/>
      </Svg>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 100
  },
  buttonContainerYellow: {
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
    zIndex: 999
  },
  buttonContainerGray: {
    backgroundColor: '#D9D9D9',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  buttonText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  inputField: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 12,
    borderColor: 'white',
    borderWidth: 1,
    borderRadius: 100,
    backgroundColor: 'white',
    zIndex: 999
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // Align items to the center
    paddingTop: 50, // Add padding at the top
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: '#3E51CC',
    color: 'white'
  },
  profileWrapper: {
    flexDirection: 'row', // Horizontal layout
    alignItems: 'center',
    gap: 24, // Spacing between items (React Native doesn't support `gap`, so use `margin` or `padding` manually if needed)
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: 'white'
  },
  buttonContainer: {
    marginTop: 15,
    marginBottom: 15,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10, // React Native doesn't support `gap`, so use `marginBottom` for spacing between buttons
  },
  buttonContainerRow: {
    marginTop: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10, // React Native doesn't support `gap`, so use `marginBottom` for spacing between buttons
  },
  image: {
    width: 300,
    height: 300,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  statusContainer: {
    marginTop: 20,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    width: '90%',
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  responseText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderText: {
    marginTop: 30,
    fontSize: 16,
    color: '#888',
  },
  planet: {
    position: 'absolute',
    bottom: -200,
    zIndex: 0
  },
  star1: {
    position: 'absolute',
    right: '10%',
    top: '30%'
  },
  star2: {
    position: 'absolute',
    left: '15%',
    top: '20%'
  },
  text: {
    color: 'white'
  },
  inputContainer: {
    minWidth: '60%',
    maxWidth: '80%'
  }
})
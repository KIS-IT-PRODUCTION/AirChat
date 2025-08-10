import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#591616ff', fontSize: 24 }}>Messages</Text>
    </SafeAreaView>
  );
}
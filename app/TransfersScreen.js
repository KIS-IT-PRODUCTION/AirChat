import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function TransfersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#fff', fontSize: 24 }}>My Transfers</Text>
    </SafeAreaView>
  );
}
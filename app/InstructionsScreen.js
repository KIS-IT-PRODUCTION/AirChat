import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function InstructionsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('passenger'); 
  const navigation = useNavigation();

  const handleGoBack = () => {
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={handleGoBack} style={{ marginBottom: 20 }}>
          <Text style={{ color: '#007BFF' }}>{t('common.back')}</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{t('instructions.title')}</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'passenger' && styles.activeButton]}
            onPress={() => setActiveTab('passenger')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'passenger' && styles.activeText]}>
              {t('instructions.tabs.passenger')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'driver' && styles.activeButton]}
            onPress={() => setActiveTab('driver')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'driver' && styles.activeText]}>
              {t('instructions.tabs.driver')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {activeTab === 'passenger' ? (
            <View style={styles.instructionsBlock}>
              <InstructionStep number="1" text={t('instructions.passenger.step1')} />
              <InstructionStep number="2" text={t('instructions.passenger.step2')} />
              <InstructionStep number="3" text={t('instructions.passenger.step3')} />
              <InstructionStep number="4" text={t('instructions.passenger.step4')} />
            </View>
          ) : (
            <View style={styles.instructionsBlock}>
              <InstructionStep number="1" text={t('instructions.driver.step1')} />
              <InstructionStep number="2" text={t('instructions.driver.step2')} />
              <InstructionStep number="3" text={t('instructions.driver.step3')} />
              <InstructionStep number="4" text={t('instructions.driver.step4')} />
            </View>
          )}
        </ScrollView>
        
      </View>
    </SafeAreaView>
  );
}

const InstructionStep = ({ number, text }) => (
  <View style={styles.stepContainer}>
    <View style={styles.stepCircle}>
      <Text style={styles.stepNumber}>{number}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C757D',
  },
  activeText: {
    color: '#007BFF',
  },
  contentContainer: {
    flex: 1,
  },
  instructionsBlock: {
    paddingBottom: 40,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E7F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumber: {
    color: '#007BFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
  },
});
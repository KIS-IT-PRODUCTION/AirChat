import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function InstructionsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const handleGoBack = () => {
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={handleGoBack} style={{ marginBottom: 20 }}>
          <Text style={{ color: '#007BFF' }}>{t('common.back', 'Назад')}</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{t('instructions.title', 'Інструкція')}</Text>

        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.instructionsBlock}>
            <InstructionStep 
              number="1" 
              text={t('instructions.passenger.step1', 'Створіть заявку на поїздку:\nвкажіть звідки, куди та коли ви плануєте їхати.')} 
            />
            <InstructionStep 
              number="2" 
              text={t('instructions.passenger.step2', 'Отримайте пропозицію поїздки від EUROBUS.')} 
            />
            <InstructionStep 
              number="3" 
              text={t('instructions.passenger.step3', 'Підтвердьте поїздку.')} 
            />
            <InstructionStep 
              number="4" 
              text={t('instructions.passenger.step4', 'Тримайте зв’язок у чаті або телефоном та вирушайте у поїздку.\nПриємної поїздки!')} 
            />
          </View>
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
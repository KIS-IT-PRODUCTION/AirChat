import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';

const InputWithIcon = ({ icon, placeholder, value, onChangeText, secureTextEntry = false, autoCapitalize = 'sentences', placeholderKey }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);

  const finalPlaceholder = placeholderKey ? t(placeholderKey) : placeholder;

  return (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={finalPlaceholder}
        placeholderTextColor={colors.secondaryText}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: 50,
  },
});

export default InputWithIcon;

import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { chatAIApi } from '../api/chatAI';
import { useTheme } from '../context/ThemeContext';

export default function AIScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const QUICK_REPLIES = [t('ai.movie_suggestions_today'), t('ai.best_horror'), t('ai.trending_series'), t('ai.vn_movies')];

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem('@ai_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const loadHistory = async () => {
    try {
      const hist = await AsyncStorage.getItem('@ai_chat_history');
      if (hist) setMessages(JSON.parse(hist));
      else {
        setMessages([{ role: 'assistant', content: t('ai.hi_ai') }]);
      }
    } catch {}
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);

    // Auto scroll down
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // AI response
      const reply = await chatAIApi.chat(newMsgs);
      setMessages([...newMsgs, { role: 'assistant', content: reply }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages([...newMsgs, { role: 'assistant', content: t('ai.busy') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    await AsyncStorage.removeItem('@ai_chat_history');
    setMessages([{ role: 'assistant', content: t('ai.history_cleared') }]);
  };

  const renderBubble = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {!isUser && <View style={styles.aiAvatar}><Text style={{fontSize: 16}}>🤖</Text></View>}
        <View style={[styles.bubble, isUser ? [styles.bubbleBgUser, { backgroundColor: themeColor }] : styles.bubbleBgAI]}>
          <Text style={styles.bubbleText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Hub ✨</Text>
        <TouchableOpacity onPress={clearHistory}>
          <Ionicons name="trash-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderBubble}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.chatArea}
        showsVerticalScrollIndicator={false}
      />

      {isLoading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator color={themeColor} />
          <Text style={{color: '#9ca3af', marginLeft: 10}}>{t('ai.thinking')}</Text>
        </View>
      )}

      {/* Quick Replies */}
      <View style={{height: 50}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesContent}>
          {QUICK_REPLIES.map((text, i) => (
            <TouchableOpacity key={i} style={[styles.chip, { borderColor: themeColor, backgroundColor: `${themeColor}1A` }]} onPress={() => handleSend(text)}>
              <Text style={[styles.chipText, { color: themeColor }]}>{text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={styles.input}
          placeholder={t('ai.ask_movies_actors')}
          placeholderTextColor="#777"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: themeColor }]} onPress={() => handleSend(input)}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222230',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatArea: {
    padding: 15,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 15,
    maxWidth: '85%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  bubbleAI: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 30, height: 30,
    borderRadius: 15,
    backgroundColor: '#222230',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  bubble: {
    padding: 12,
    borderRadius: 15,
  },
  bubbleBgUser: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  bubbleBgAI: {
    backgroundColor: '#222230',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  quickRepliesContent: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#1a1a22',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  chipText: {
    color: '#3b82f6',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: '#0f0f13',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#222230',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 10,
  }
});

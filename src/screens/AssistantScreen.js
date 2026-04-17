import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme/Theme';
import { FirebaseService } from '../services/FirebaseService';
import { useApp } from '../context/AppContext';

export const AssistantScreen = ({ navigation }) => {
    const { user } = useApp();
    const [messages, setMessages] = useState([
        {
            id: 'system-1',
            role: 'assistant',
            content: 'Olá! Sou o seu Assistente Virtual especialista. Como posso ajudar nas suas abordagens hoje?'
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef(null);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true
        });

        if (!result.canceled) {
            setSelectedImage({
                uri: result.assets[0].uri,
                base64: result.assets[0].base64
            });
        }
    };

    const sendMessage = async () => {
        if ((!inputText.trim() && !selectedImage) || isLoading) return;

        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim(),
            imageUrl: selectedImage ? selectedImage.uri : null
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);

        const capturedImageBase64 = selectedImage ? selectedImage.base64 : null;

        setInputText('');
        setSelectedImage(null);
        setIsLoading(true);

        try {
            // Build history payload for OpenAI (excluding local IDs)
            const history = newMessages
                .filter(m => m.id !== 'system-1') // We skip the local greeting to save tokens
                .map(m => ({ role: m.role, content: m.content }));

            const replyText = await FirebaseService.askAssistant(userMsg.content, history.slice(0, -1), capturedImageBase64);

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: replyText
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error("Assistant Error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpe, ocorreu um erro ao me conectar. Tente novamente em alguns instantes.',
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
                {!isUser && (
                    <View style={styles.avatarAI}>
                        <Ionicons name="sparkles" size={16} color="#fff" />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isUser ? styles.messageBubbleUser : styles.messageBubbleAI,
                    item.isError && { backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }
                ]}>
                    {item.imageUrl && (
                        <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                    )}
                    {item.content ? (
                        <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAI, item.isError && { color: '#b91c1c' }]}>
                            {item.content}
                        </Text>
                    ) : null}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Ionicons name="chatbubbles" size={24} color={theme.colors.primary} />
                    <Text style={styles.headerTitle}>Consultor IA</Text>
                </View>
                <Text style={styles.headerSubtitle}>Tire dúvidas e simule contra-argumentos</Text>
            </View>

            {/* Chat Area */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatContainer}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton} onPress={pickImage} disabled={isLoading}>
                        <Ionicons name="image-outline" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Digite sua dúvida aqui..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, ((!inputText.trim() && !selectedImage) || isLoading) && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={(!inputText.trim() && !selectedImage) || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 4 }} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    messageWrapperUser: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageWrapperAI: {
        alignSelf: 'flex-start',
        alignItems: 'flex-end',
    },
    avatarAI: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 4, // Align with bottom of bubble roughly
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    messageBubbleUser: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    messageBubbleAI: {
        backgroundColor: '#f3f4f6',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    messageTextUser: {
        color: '#fff',
    },
    messageTextAI: {
        color: theme.colors.text,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginBottom: 8,
    },
    imagePreviewContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    imagePreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    removeImageBtn: {
        position: 'absolute',
        left: 64,
        top: 4,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        alignItems: 'flex-end',
    },
    attachButton: {
        padding: 8,
        marginRight: 4,
        marginBottom: 4,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12, // Needs both top and bottom equal padding when multiline
        paddingBottom: 12,
        maxHeight: 120,
        fontSize: 15,
        color: theme.colors.text,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        marginBottom: 2, // Fine tune alignment with input
    },
    sendButtonDisabled: {
        backgroundColor: '#d1d5db',
    }
});

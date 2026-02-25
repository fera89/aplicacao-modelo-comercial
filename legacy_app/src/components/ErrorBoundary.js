import React from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Ops! Algo deu errado.</Text>
                    <Text style={styles.subtitle}>O aplicativo encontrou um erro inesperado.</Text>
                    <ScrollView style={styles.errorContainer}>
                        <Text style={styles.errorText}>{this.state.error && this.state.error.toString()}</Text>
                    </ScrollView>
                    <Button title="Tentar Novamente" onPress={() => this.setState({ hasError: false })} />
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#e74c3c',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    errorContainer: {
        maxHeight: 200,
        width: '100%',
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
    },
    errorText: {
        color: '#333',
        fontFamily: 'monospace',
        fontSize: 12,
    },
});

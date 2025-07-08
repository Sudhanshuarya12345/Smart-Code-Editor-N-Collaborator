import React, { useState, useEffect, useContext, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import axios from '../config/axios.js'
import { initializeSocket, recieveMessage, sendMessage } from '../config/socket.js'
import { UserContext } from '../context/user.context.jsx'
import Markdown from 'markdown-to-jsx'
import { RiFolder3Line, RiFolderOpenLine, RiFile3Line, RiAddLine } from 'react-icons/ri'
import { getWebContainer } from '../config/webContainer.js'


const Project = () => {
    const location = useLocation()

    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false) // <-- Added state for modal
    const [selectedUserId, setSelectedUserId] = useState(new Set()) // <-- Store selected user ID
    const [users, setUsers] = useState([]) // <-- Store users data
    const [project, setProject] = useState(location.state.project)
    const [message, setMessage] = useState('') // <-- Store messages data
    const [messages, setMessages] = useState([]) // <-- NEW STATE for messages
    const [aidatacopiedStatus, setaidataCopiedStatus] = useState(false);  // <-- NEW STATE for ai response copied status
    const [logscopiedStatus, setlogsCopiedStatus] = useState(false);  // <-- NEW STATE for logs copied status
    const [opcopiedStatus, setopCopiedStatus] = useState(false);  // <-- NEW STATE for output copied status
    const [clearStatus, setClearStatus] = useState(false);  // <-- NEW STATE for copied status
    const [fileTree, setFileTree] = useState({}) // <-- NEW STATE for file tree
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [webContainer, setWebContainer] = useState(null)

    // Add new state for file operations
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolderPath, setSelectedFolderPath] = useState(''); // Track which folder is selected for file creation
    const [expandedFolders, setExpandedFolders] = useState({});

    const { user } = useContext(UserContext)
    const messageBox = React.createRef()
    const lineNumberRef = useRef(null);
    const textareaRef = useRef(null);
    const [activeLine, setActiveLine] = useState(1);
    const [editorWidth, setEditorWidth] = useState(600);
    const resizerRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [iframeUrl, setIframeUrl] = useState(null)

    // Add new states for container status
    const [containerStatus, setContainerStatus] = useState('idle')
    const [statusMessage, setStatusMessage] = useState('')
    const [currentProcess, setCurrentProcess] = useState(null)
    const [outputLogs, setOutputLogs] = useState([]) // Add this for output logs
    const [activeTab, setActiveTab] = useState('preview') // 'preview' | 'output'

    // Add state for output modal
    const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
    // Feedback states for output modal buttons
    const [reloadedStatus, setReloadedStatus] = useState(false);

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId)
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id) // remove if already present
            } else {
                newSelectedUserId.add(id) // add if not present
            }
            return newSelectedUserId;
        })
    }

    function addCollaborators() {
        axios.put(`/projects/add-user`, {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        })
            .then(response => {
                console.log(response.data)
                setIsModalOpen(false)
            })
            .catch(error => {
                console.log(error)
            })
    }

    const send = () => {
        sendMessage('project-message', {
            message,
            sender: user,
        })
        setMessages(prevMessages => [...prevMessages, {
            message,
            sender: user,
            type: 'outgoing',
        }])

        setMessage('')
    }

    function writeAiMessage(message) {
        let messageObject;
        try {
            messageObject = JSON.parse(message);
        } catch (e) {
            messageObject = { text: message };
        }

        return (
            <div className='overflow-auto bg-slate-800/50 rounded-lg border border-blue-500/20'>
                {/* AI Header */}
                <div className='flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-900/50 to-slate-800/50 border-b border-blue-500/20'>
                    <div className='flex items-center gap-2'>
                        <div className='w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center'>
                            <i className='ri-robot-2-line text-white text-sm'></i>
                        </div>
                        <span className='text-sm font-medium text-blue-300'>AI Assistant</span>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(messageObject.text);
                            setaidataCopiedStatus(true);
                            setTimeout(() => setaidataCopiedStatus(false), 1000);
                        }}
                        className='text-xs bg-slate-700/50 hover:bg-slate-600/50 px-2 py-1 rounded text-blue-300 transition flex items-center gap-1'
                        title={aidatacopiedStatus ? "Copied!" : "Copy to clipboard"}
                    >
                        <i className={aidatacopiedStatus ? 'ri-check-line' : 'ri-clipboard-fill'}></i>
                        <span>{aidatacopiedStatus ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>

                {/* AI Message Content */}
                <div className='p-4'>
                    <Markdown
                        children={messageObject.text}
                        className='prose prose-invert max-w-none'
                        options={{
                            overrides: {
                                h1: { props: { className: 'text-xl font-bold mb-3 text-blue-300 border-b border-blue-500/20 pb-2' } },
                                h2: { props: { className: 'text-lg font-semibold mb-2 text-blue-200' } },
                                p: { props: { className: 'mb-3 text-slate-200 leading-relaxed' } },
                                li: { props: { className: 'list-disc ml-5 mb-2 text-slate-200' } },
                                code: { props: { className: 'bg-slate-900 text-green-400 px-1.5 py-0.5 rounded text-sm font-mono' } },
                                pre: { props: { className: 'bg-slate-900 p-3 rounded-lg mb-3 overflow-x-auto border border-slate-700' } },
                                strong: { props: { className: 'font-bold text-blue-200' } },
                                a: { props: { className: 'text-blue-400 hover:text-blue-300 underline' } },
                                blockquote: { props: { className: 'border-l-4 border-blue-500 pl-4 italic text-slate-300 my-3' } },
                                ul: { props: { className: 'list-disc ml-5 mb-3' } },
                                ol: { props: { className: 'list-decimal ml-5 mb-3' } },
                            }
                        }}
                    />
                </div>
            </div>
        );
    }

    // Add file operations handlers
    const handleCreateFile = () => {
        if (!newFileName.trim()) return;

        // Determine file extension based on input
        let fileName = newFileName.trim();
        if (!fileName.includes('.')) {
            fileName = `${fileName}.js`; // Default to .js if no extension
        }

        // Create the new file
        const newFile = {
            file: {
                contents: '// Start coding here...\n'
            }
        };

        // If we have a selected folder, create the file inside that folder
        if (selectedFolderPath) {
            setFileTree(prev => {
                const updateTree = (tree, pathArr, newFile) => {
                    if (pathArr.length === 1) {
                        const folderName = pathArr[0];
                        if (tree[folderName]?.directory) {
                            return {
                                ...tree,
                                [folderName]: {
                                    ...tree[folderName],
                                    directory: {
                                        ...tree[folderName].directory,
                                        [fileName]: newFile
                                    }
                                }
                            };
                        }
                        return tree;
                    }
                    const [head, ...rest] = pathArr;
                    if (!tree[head]) return tree;
                    
                    return {
                        ...tree,
                        [head]: {
                            ...tree[head],
                            directory: updateTree(tree[head].directory || {}, rest, newFile)
                        }
                    };
                };

                const updatedTree = updateTree(prev, selectedFolderPath.split('/'), newFile);
                
                // Update WebContainer if available
                if (webContainer) {
                    webContainer.mount(updatedTree).catch(error => {
                        console.error('Failed to mount new file to WebContainer:', error);
                    });
                }
                
                return updatedTree;
            });

            const fullFilePath = `${selectedFolderPath}/${fileName}`;
            setCurrentFile(fullFilePath);
            setOpenFiles(prev => [...new Set([...prev, fullFilePath])]);
        } else {
            // Create file in root directory
            setFileTree(prev => ({
                ...prev,
                [fileName]: newFile
            }));

            // Update WebContainer if available
            if (webContainer) {
                webContainer.mount({
                    ...fileTree,
                    [fileName]: newFile
                }).catch(error => {
                    console.error('Failed to mount new file to WebContainer:', error);
                });
            }

            setCurrentFile(fileName);
            setOpenFiles(prev => [...new Set([...prev, fileName])]);
        }

        setNewFileName('');
        setIsCreatingFile(false);
        setSelectedFolderPath(''); // Reset selected folder
    };

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;

        const folderName = newFolderName.trim();
        const newFolder = {
            directory: {}
        };

        // If we have a selected folder, create the folder inside that folder
        if (selectedFolderPath) {
            setFileTree(prev => {
                const updateTree = (tree, pathArr, newFolder) => {
                    if (pathArr.length === 1) {
                        const parentFolderName = pathArr[0];
                        if (tree[parentFolderName]?.directory) {
                            return {
                                ...tree,
                                [parentFolderName]: {
                                    ...tree[parentFolderName],
                                    directory: {
                                        ...tree[parentFolderName].directory,
                                        [folderName]: newFolder
                                    }
                                }
                            };
                        }
                        return tree;
                    }
                    const [head, ...rest] = pathArr;
                    if (!tree[head]) return tree;
                    
                    return {
                        ...tree,
                        [head]: {
                            ...tree[head],
                            directory: updateTree(tree[head].directory || {}, rest, newFolder)
                        }
                    };
                };

                const updatedTree = updateTree(prev, selectedFolderPath.split('/'), newFolder);
                
                // Update WebContainer if available
                if (webContainer) {
                    webContainer.mount(updatedTree).catch(error => {
                        console.error('Failed to mount new folder to WebContainer:', error);
                    });
                }
                
                return updatedTree;
            });
        } else {
            // Create folder in root directory
            setFileTree(prev => ({
                ...prev,
                [folderName]: newFolder
            }));

            // Update WebContainer if available
            if (webContainer) {
                webContainer.mount({
                    ...fileTree,
                    [folderName]: newFolder
                }).catch(error => {
                    console.error('Failed to mount new folder to WebContainer:', error);
                });
            }
        }

        setNewFolderName('');
        setIsCreatingFolder(false);
        setSelectedFolderPath(''); // Reset selected folder
    };

    const handleCloseFile = (fileName) => {
        setOpenFiles(prev => prev.filter(f => f !== fileName));
        if (currentFile === fileName) {
            const remainingFiles = openFiles.filter(f => f !== fileName);
            setCurrentFile(remainingFiles[remainingFiles.length - 1] || null);
        }

        // Note: We don't remove the file from fileTree or WebContainer
        // as it might still be needed by the running application
        // Users can delete files through the file explorer if needed
    };

    // Add keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                setIsCreatingFile(true);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    useEffect(() => {
        initializeSocket(project._id) // Initialize socket connection

        const initializeContainer = async () => {
            try {
                const container = await getWebContainer();
                setWebContainer(container);
                console.log("Container started");

                // Initialize file system with project files
                if (project.files) {
                    await container.mount(project.files);
                    setFileTree(project.files);
                }
            } catch (error) {
                console.error("Failed to initialize WebContainer:", error);
            }
        };

        // Initialize container immediately
        initializeContainer();

        recieveMessage('chat-history', (history) => {
            setMessages(history.map(msg => ({
                ...msg,
                type: msg.sender?.email === user?.email ? 'outgoing' : 'incoming'
            })));
        });

        let currentWebContainer = null;
        recieveMessage('project-message', async data => {
            try {
                let message;
                try {
                    message = JSON.parse(data.message);
                } catch (e) {
                    message = data.message;
                }

                if (message.fileTree) {
                    patchExpressPortInFileTree(message.fileTree); // Patch before mounting
                    patchPackageJsonStartScript(message.fileTree); // Patch start script
                    patchStaticFrontendProject(message.fileTree); // Patch static frontend

                    // Get the latest webContainer instance
                    if (!currentWebContainer) {
                        currentWebContainer = await getWebContainer();
                        setWebContainer(currentWebContainer);
                    }

                    if (currentWebContainer) {
                        await currentWebContainer.mount(message.fileTree);
                        setFileTree(message.fileTree);
                    } else {
                        console.error('WebContainer not initialized');
                    }
                }

                setMessages(prevMessages => [...prevMessages, { ...data, type: 'incoming' }]);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        axios.get(`/projects/get-project/${location.state.project._id}`)
            .then(response => {
                console.log(response.data.project)
                setProject(response.data.project)
            })

        axios.get('/users/all')
            .then(response => {
                setUsers(response.data.users)
            })
            .catch(error => {
                console.log(error)
            })

        // Cleanup function
        return () => {
            if (currentWebContainer) {
                currentWebContainer = null;
            }
        };
    }, []);


    useEffect(() => {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight
        }
    }, [messages, messageBox])

    // Compute users not in the project
    const projectUserIds = new Set((project.users || []).map(u => typeof u === 'object' ? u._id : u));
    const usersNotInProject = users.filter(u => !projectUserIds.has(u._id));

    // Sync scroll between textarea and line numbers
    const handleEditorScroll = (e) => {
        if (lineNumberRef.current) {
            lineNumberRef.current.scrollTop = e.target.scrollTop;
        }
        updateActiveLine();
    };

    // Update active line based on cursor position
    const updateActiveLine = () => {
        if (textareaRef.current) {
            const value = textareaRef.current.value;
            const selectionStart = textareaRef.current.selectionStart;
            const lines = value.substr(0, selectionStart).split('\n');
            setActiveLine(lines.length);
        }
    };

    // Auto-focus editor when file is selected
    useEffect(() => {
        if (textareaRef.current && currentFile) {
            textareaRef.current.focus();
        }
    }, [currentFile]);

    // Resizable editor panel
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            setEditorWidth(Math.max(300, e.clientX - (resizerRef.current?.getBoundingClientRect().left || 0)));
        };
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Helper to toggle folder open/close
    const toggleFolder = (path) => {
        setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
    };

    // Recursive file tree renderer
    const renderFileTree = (tree, parentPath = '', depth = 0) => {
        if (!tree) return null;

        return Object.entries(tree).map(([name, node]) => {
            const path = parentPath ? `${parentPath}/${name}` : name;
            const isExpanded = expandedFolders[path];

            if (node.directory) {
                return (
                    <div key={path} style={{ marginLeft: `${depth * 20}px` }}>
                        <div
                            className="flex items-center gap-2 py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer group"
                            onClick={() => toggleFolder(path)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setSelectedFolderPath(path);
                                setIsCreatingFile(true);
                            }}
                        >
                            {isExpanded ? <RiFolderOpenLine className="text-yellow-500" /> : <RiFolder3Line className="text-yellow-500" />}
                            <span className="text-slate-200">{name}</span>
                            {/* Context menu indicator */}
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFolderPath(path);
                                        setIsCreatingFile(true);
                                    }}
                                    className="p-1 hover:bg-slate-600/50 rounded text-slate-400 hover:text-blue-400"
                                    title="Create file in this folder"
                                >
                                    <i className="ri-add-line text-xs" />
                                </button>
                            </div>
                        </div>
                        {isExpanded && renderFileTree(node.directory, path, depth + 1)}
                    </div>
                );
            } else if (node.file) {
                return (
                    <div
                        key={path}
                        className={`flex items-center gap-2 py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer ${currentFile === path ? 'bg-slate-700/50' : ''}`}
                        style={{ marginLeft: `${depth * 20}px` }}
                        onClick={() => {
                            setCurrentFile(path);
                            if (!openFiles.includes(path)) {
                                setOpenFiles(prev => [...prev, path]);
                            }
                        }}
                    >
                        <RiFile3Line className="text-blue-400" />
                        <span className="text-slate-200">{name}</span>
                    </div>
                );
            }
            return null;
        });
    };

    // Helper to resolve a file node by its path (e.g., 'backend/server.js')
    const getFileNodeByPath = (tree, path) => {
        if (!path || !tree) return null;
        const parts = path.split('/');
        let node = tree;

        for (let part of parts) {
            if (!node || !node[part]) return null;
            node = node[part];
        }

        // Return the file contents if it's a file node
        if (node.file) {
            return node.file;
        }

        // Return the node itself if it has contents (direct file)
        if (node.contents !== undefined) {
            return node;
        }

        return null;
    };

    // Add cleanup function
    const cleanupContainer = async () => {
        try {
            if (currentProcess) {
                await currentProcess.kill();
                setCurrentProcess(null);
            }

            setContainerStatus('idle');
            setStatusMessage('');
            setIframeUrl(null);
            setOutputLogs([]);
            setActiveTab('preview');

            if (webContainer) {
                await webContainer.mount({});
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    };

    // Update the close button handler
    const handleCloseServer = async () => {
        await cleanupContainer();
    };

    // Update the run button handler
    const handleRunServer = async () => {
        try {
            await cleanupContainer();
            setOutputLogs([]); // Clear previous logs

            setContainerStatus('installing');
            setStatusMessage('Setting up environment...');
            setOutputLogs(prev => [...prev, 'Setting up environment...']);

            // First mount the file tree
            await webContainer?.mount(fileTree);

            // Install dependencies
            setStatusMessage('Installing dependencies...');
            setOutputLogs(prev => [...prev, 'Installing dependencies...']);
            const installProcess = await webContainer?.spawn('npm', ['install']);

            if (installProcess && installProcess.output) {
                installProcess.output.pipeTo(new WritableStream({
                    write(chunk) {
                        console.log(chunk);
                        setOutputLogs(prev => [...prev, chunk]);
                    }
                }));

                setCurrentProcess(installProcess);
                await installProcess.exit;
            } else {
                throw new Error('Failed to start installation process');
            }

            setCurrentProcess(null);

            // Start the server
            setContainerStatus('starting');
            setStatusMessage('Starting server...');
            setOutputLogs(prev => [...prev, 'Starting server...']);

            if (currentProcess) {
                currentProcess.kill()
            }

            const tempRunProcess = await webContainer?.spawn('npm', ['start']);

            if (tempRunProcess && tempRunProcess.output) {
                tempRunProcess.output.pipeTo(new WritableStream({
                    write(chunk) {
                        console.log(chunk);
                        setOutputLogs(prev => [...prev, chunk]);
                    }
                }));

                setCurrentProcess(tempRunProcess);

                webContainer.on('server-ready', (port, url) => {
                    console.log(`Server ready at ${url}`);
                    setOutputLogs(prev => [...prev, `Server ready at ${url}`]);
                    setIframeUrl(url);
                    setContainerStatus('running');
                    setStatusMessage('Server is running');
                });
            } else {
                throw new Error('Failed to start server process');
            }

        } catch (error) {
            console.error('Error running application:', error);
            setContainerStatus('error');
            setStatusMessage('Error: ' + error.message);
            setOutputLogs(prev => [...prev, `Error: ${error.message}`]);
            setCurrentProcess(null);
        }
    };

    // Helper to patch Express server files to use process.env.PORT
    function patchExpressPortInFileTree(tree) {
        const patchFile = (contents) => {
            // Replace const port = 3000; or let port = 3000; with process.env.PORT || 3000
            return contents.replace(/(const|let)\s+port\s*=\s*['"]?3000['"]?;/, '$1 port = process.env.PORT || 3000;');
        };
        for (const [name, node] of Object.entries(tree)) {
            if (node.file && (name === 'app.js' || name === 'server.js')) {
                node.file.contents = patchFile(node.file.contents);
            } else if (node.directory) {
                patchExpressPortInFileTree(node.directory);
            }
        }
    }

    // Helper to patch package.json to ensure a start script exists
    function patchPackageJsonStartScript(tree) {
        let mainFile = null;
        if (tree['app.js']) mainFile = 'app.js';
        else if (tree['server.js']) mainFile = 'server.js';
        if (tree['package.json'] && tree['package.json'].file) {
            try {
                const pkg = JSON.parse(tree['package.json'].file.contents);
                if (!pkg.scripts) pkg.scripts = {};
                if (!pkg.scripts.start && mainFile) {
                    pkg.scripts.start = `node ${mainFile}`;
                    tree['package.json'].file.contents = JSON.stringify(pkg, null, 2);
                }
            } catch (e) {
                // ignore
            }
        }
        // Recurse into directories
        for (const [name, node] of Object.entries(tree)) {
            if (node.directory) patchPackageJsonStartScript(node.directory);
        }
    }

    // Helper to patch static frontend projects to add a live-server start script
    function patchStaticFrontendProject(tree) {
        const hasIndexHtml = !!tree['index.html'];
        const hasPackageJson = !!tree['package.json'];
        const hasBackend = tree['app.js'] || tree['server.js'];
        if (hasIndexHtml && !hasBackend) {
            // Add or patch package.json
            if (!hasPackageJson) {
                tree['package.json'] = {
                    file: {
                        contents: JSON.stringify({
                            name: 'static-frontend',
                            version: '1.0.0',
                            scripts: {
                                start: 'npx live-server --port=3000 --no-browser'
                            },
                            devDependencies: {
                                'live-server': '^1.2.2'
                            }
                        }, null, 2)
                    }
                };
            } else {
                try {
                    const pkg = JSON.parse(tree['package.json'].file.contents);
                    if (!pkg.scripts) pkg.scripts = {};
                    if (!pkg.scripts.start) {
                        pkg.scripts.start = 'npx live-server --port=3000 --no-browser';
                    }
                    if (!pkg.devDependencies) pkg.devDependencies = {};
                    pkg.devDependencies['live-server'] = '^1.2.2';
                    tree['package.json'].file.contents = JSON.stringify(pkg, null, 2);
                } catch (e) { }
            }
        }
        // Recurse into directories
        for (const [name, node] of Object.entries(tree)) {
            if (node.directory) patchStaticFrontendProject(node.directory);
        }
    }

    // Force stop handler
    const handleForceStop = async () => {
        try {
            if (currentProcess) {
                await currentProcess.kill();
                setCurrentProcess(null);
            }
            setContainerStatus('idle');
            setStatusMessage('Force stopped');
            setIframeUrl(null);
            setOutputLogs([]);
            setActiveTab('preview');
            if (webContainer) {
                await webContainer.mount({});
            }
        } catch (error) {
            setStatusMessage('Error during force stop: ' + error.message);
        }
    };

    return (
        <main className="h-screen min-h-screen w-screen flex bg-slate-900 text-slate-100">
            {/* Left Panel: Chat & Collaborators */}
            <section className="left relative flex flex-col h-full w-96 bg-gradient-to-br from-blue-900 via-slate-900 to-blue-800 shadow-2xl rounded-l-2xl border-r border-blue-900/70 backdrop-blur-md">
                {/* Header Box */}
                <header className="flex flex-col items-center p-4 w-full gap-2 bg-gradient-to-br from-blue-900 via-slate-900 to-blue-800 shadow-2xl rounded-l-2xl border-r border-blue-900/70 backdrop-blur-md">
                    <div className="flex justify-start absolute left-1 top-1">
                        <Link to="/" className="flex items-center gap-2 px-2 py-1 bg-blue-100 text-blue-500 rounded-full hover:bg-blue-200 transition">
                            <i className="ri-home-4-line text-lg"></i>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-500 text-xs font-medium px-2 py-1 rounded-full">
                            <i className="ri-user-fill text-sm"></i>
                        </div>
                        <span className="text-lg font-semibold text-blue-500">{user?.email}</span>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <div className="text-sm text-blue-300">Project:</div>
                        <div className="text-lg font-semibold text-blue-500">{project?.name}</div>
                    </div>

                    <div className="flex flex-row items-center justify-between w-full">
                        {/* Add Collaborator Button */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex gap-2 items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition duration-200 transform hover:scale-105"
                        >
                            <i className="ri-user-add-line text-base"></i>
                            <span className="text-sm">Add Collaborator</span>
                        </button>

                        {/* Show Collaborators Button */}
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className="flex gap-2 items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-md transition duration-200 transform hover:scale-105"
                        >
                            <i className="ri-group-line text-base"></i>
                            <span className="text-sm">View Collaborators</span>
                        </button>
                    </div>

                </header>
                <div className="flex flex-col flex-grow h-0"> {/* This wraps the chat area and makes it fill the panel */}
                    {/* Chat Area */}
                    <div className="conversation-area flex flex-col h-full px-0 py-0 bg-slate-800 w-full max-w-[420px] min-w-[320px] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
                        {/* Header Bar */}
                        <div className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 border-b border-slate-700">
                            <i className="ri-chat-3-line text-blue-400 text-xl"></i>
                            <span className="font-semibold text-blue-300 text-lg">Messages</span>
                        </div>
                        {/* Scrollable messages */}
                        <div
                            ref={messageBox}
                            className="flex-grow flex flex-col gap-7 px-4 py-4 overflow-y-auto w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ minHeight: '0' }}
                        >
                            {messages.map((msg, index) => {
                                const isOutgoing = msg.sender?.email === user?.email;
                                const isAI = msg.sender?.type === 'ai';

                                return (
                                    <div
                                        key={index}
                                        className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group mb-4`}
                                    >
                                        <span className="text-xs text-slate-400 mb-1 ml-2 mr-2">
                                            {isAI ? 'AI Assistant' : msg.sender?.email}
                                        </span>
                                        <div
                                            className={`
                                                max-w-xs md:max-w-md
                                                ${isAI
                                                    ? 'w-full'
                                                    : `px-5 py-3 rounded-2xl shadow-lg text-base font-medium whitespace-pre-wrap break-words
                                                       transition-all duration-200
                                                       ${isOutgoing
                                                        ? 'bg-slate-700 text-blue-100 border border-slate-600 rounded-br-3xl rounded-tr-2xl'
                                                        : 'bg-blue-900 text-blue-200 border border-blue-700 rounded-bl-3xl rounded-tl-2xl'}
                                                       group-hover:shadow-xl`
                                                }
                                            `}
                                            style={{
                                                boxShadow: isAI ? 'none' : '0 4px 16px 0 rgba(0,0,0,0.10)',
                                                transition: 'box-shadow 0.2s'
                                            }}
                                        >
                                            {isAI ? writeAiMessage(msg.message) : msg.message}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Fixed input at the bottom */}
                        <div className="w-full flex justify-center pt-2 pb-2 bg-slate-900 border-t border-slate-700">
                            <div className="flex w-full max-w-[400px] gap-2">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                                    className="flex-grow px-4 py-3 rounded-l-xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 bg-slate-800 text-blue-100 shadow focus:bg-slate-900 transition"
                                    type="text" placeholder="Enter message"
                                />
                                <button
                                    onClick={send}
                                    className="px-7 bg-blue-500 hover:bg-blue-600 text-white rounded-r-xl shadow transition"
                                >
                                    <i className="ri-send-plane-fill"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Side Panel: Collaborators */}
                <div className={`sidePanel w-full h-full flex flex-col gap-2 bg-slate-800 shadow-xl absolute transition-all duration-300 z-30 ${isSidePanelOpen ? 'left-0' : '-left-full'} top-0 rounded-l-2xl`}>
                    <header className="flex justify-between items-center p-4 w-full bg-gradient-to-br from-blue-900 via-slate-900 to-blue-800 shadow-2xl rounded-l-2xl border-r border-blue-900/70 backdrop-blur-md">
                        <h1 className="font-semibold text-lg text-blue-300">Collaborators</h1>
                        <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className="p-2 rounded-full hover:bg-slate-700 transition">
                            <i className="ri-close-fill text-xl"></i>
                        </button>
                    </header>
                    <div className="flex flex-col gap-2 p-4 overflow-y-auto">
                        {(!project.users || project.users.length === 0) && (
                            <div className="text-slate-500 text-center py-4">No collaborators found for this project.</div>
                        )}
                        {project.users && project.users.map((u, idx) => {
                            const userObj = typeof u === 'object' && u.email ? u : users.find(usr => usr._id === (u._id || u));
                            if (!userObj) return null;
                            return (
                                <div key={userObj._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700 transition">
                                    <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                                        {userObj.email[0].toUpperCase()}
                                    </div>
                                    <span className="text-slate-100">{userObj.email}</span>
                                    <span className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold ${idx === 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-slate-700 text-slate-300'}`}>{idx === 0 ? 'Owner' : 'Member'}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Collaborator Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-blue-300">Add Collaborators</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition p-2 hover:bg-slate-700 rounded-lg">
                                    <i className="ri-close-line text-2xl"></i>
                                </button>
                            </div>
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
                                {usersNotInProject.length === 0 && (
                                    <div className="text-slate-500 text-center py-4">All users are already collaborators.</div>
                                )}
                                {usersNotInProject.map((u) => (
                                    <button
                                        key={u._id}
                                        onClick={() => handleUserClick(u._id)}
                                        className={`flex items-center gap-3 p-2 rounded-lg border transition ${selectedUserId.has(u._id) ? 'bg-blue-900 border-blue-400 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-100'} hover:bg-blue-800`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                                            {u.email[0].toUpperCase()}
                                        </div>
                                        <span>{u.email}</span>
                                        {selectedUserId.has(u._id) && <i className="ri-check-line ml-auto text-blue-400"></i>}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition"
                                >Cancel</button>
                                <button
                                    onClick={addCollaborators}
                                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition"
                                    disabled={selectedUserId.size === 0 || usersNotInProject.length === 0}
                                >Add</button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
            {/* File Explorer & Code Editor */}
            <section className="flex flex-grow h-full">
                {/* File Explorer */}
                <div className="explorer h-full w-64 bg-slate-800/50 border-r border-slate-700/50 shadow-lg flex flex-col">
                    {/* File Explorer Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <RiFolder3Line className="text-blue-400" />
                            <span className="text-sm font-medium text-blue-300">Files</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* New File Button */}
                            <button
                                onClick={() => setIsCreatingFile(true)}
                                className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                                title="New File (Ctrl/Cmd + N)"
                            >
                                <i className="ri-file-add-line text-slate-400 hover:text-blue-400" />
                            </button>
                            {/* New Folder Button */}
                            <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                                title="New Folder"
                            >
                                <i className="ri-folder-add-line text-slate-400 hover:text-green-400" />
                            </button>
                        </div>
                    </div>
                    {/* File Tree (recursive) */}
                    <div className="flex-grow overflow-y-auto p-2 space-y-1">
                        {!fileTree || Object.keys(fileTree).length === 0 ? (
                            <div className="text-slate-400 text-center py-4">
                                <div className="text-sm mb-2">No files found.</div>
                                <div className="text-xs text-slate-500">Click the + button to create a new file</div>
                            </div>
                        ) : (
                            renderFileTree(fileTree)
                        )}
                    </div>
                </div>

                {/* Code Editor */}
                <div ref={resizerRef} style={{ width: editorWidth, minWidth: 300, maxWidth: 900, transition: isResizing ? 'none' : 'width 0.2s' }}
                    className="code-editor flex flex-col flex-grow h-full bg-slate-900 relative">
                    {/* Resizer */}
                    <div
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'ew-resize', zIndex: 10 }}
                        onMouseDown={() => setIsResizing(true)}
                        className="bg-blue-900/10 hover:bg-blue-500/30 transition-colors"
                    />
                    {/* Editor Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-800/50 overflow-x-auto">

                        <div className="bottom flex flex-grow">
                            {openFiles.map((file) => (
                                <div
                                    key={file}
                                    className={`group flex items-center gap-2 px-4 py-2 border-r border-slate-700/50 min-w-[120px] max-w-[200px]
                                        ${currentFile === file
                                            ? 'bg-slate-900 text-blue-300'
                                            : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                                        }`}
                                >
                                    <button
                                        onClick={() => setCurrentFile(file)}
                                        className="flex items-center gap-2 focus:outline-none flex-grow min-w-0"
                                    >
                                        <i className="ri-file-3-line text-sm flex-shrink-0"></i>
                                        <span className="text-sm truncate">{file}</span>
                                    </button>
                                    <button
                                        onClick={() => handleCloseFile(file)}
                                        className="p-1 rounded hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    >
                                        <i className="ri-close-line text-sm text-red-400 hover:text-red-300"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="actions flex gap-2">
                            <button
                                onClick={handleRunServer}
                                className={
                                    `relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                                    ${containerStatus === 'running'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : containerStatus === 'error'
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-blue-600 hover:bg-blue-700'}
                                    text-white font-medium shadow-lg hover:shadow-xl
                                    disabled:opacity-50 disabled:cursor-not-allowed`
                                }
                                disabled={containerStatus === 'installing' || containerStatus === 'starting'}
                            >
                                <div className="flex items-center gap-2">
                                    {containerStatus === 'installing' || containerStatus === 'starting' ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : containerStatus === 'running' ? (
                                        <i className="ri-check-line text-lg" />
                                    ) : containerStatus === 'error' ? (
                                        <i className="ri-error-warning-line text-lg" />
                                    ) : (
                                        <i className="ri-play-line text-lg" />
                                    )}
                                    <span>
                                        {containerStatus === 'installing' ? 'Installing...' :
                                            containerStatus === 'starting' ? 'Starting...' :
                                                containerStatus === 'running' ? 'Running' :
                                                    containerStatus === 'error' ? 'Error' :
                                                        'Run'}
                                    </span>
                                </div>
                                {statusMessage && (
                                    <div className="absolute -bottom-8 left-0 right-0 text-xs text-center text-slate-400">
                                        {statusMessage}
                                    </div>
                                )}
                            </button>
                            {/* Output Button (shows after successful execution) */}
                            {containerStatus === 'running' && iframeUrl && (
                                <button
                                    onClick={() => setIsOutputModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                >
                                    <i className="ri-window-line text-lg" />
                                    <span>Output</span>
                                </button>
                            )}
                            {/* Close Server Button */}
                            {(containerStatus === 'running' || containerStatus === 'error') && (
                                <button
                                    onClick={handleCloseServer}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                >
                                    <i className="ri-stop-line text-lg" />
                                    <span>Stop</span>
                                </button>
                            )}
                            {/* Force Stop Button */}
                            {(containerStatus === 'error' || currentProcess) && (
                                <button
                                    onClick={handleForceStop}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                >
                                    <i className="ri-close-circle-line text-lg" />
                                    <span>Force Stop</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Output Logs Tabs */}
                    {(containerStatus === 'installing' || containerStatus === 'starting' || containerStatus === 'running' || containerStatus === 'error') && (
                        <div className="flex border-b border-slate-800 bg-slate-800/50">
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'preview'
                                        ? 'text-blue-300 border-b-2 border-blue-500'
                                        : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                Preview
                            </button>
                            <button
                                onClick={() => setActiveTab('output')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'output'
                                        ? 'text-blue-300 border-b-2 border-blue-500'
                                        : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                Output Logs
                            </button>
                        </div>
                    )}

                    {/* Output Logs Display */}
                    {activeTab === 'output' && (containerStatus === 'installing' || containerStatus === 'starting' || containerStatus === 'running' || containerStatus === 'error') && (
                        <div className="flex flex-col h-full bg-slate-900 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-blue-300 font-semibold text-base">Output Logs</span>
                                <div className="flex gap-2">
                                <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(outputLogs.join('\n'));
                                            setlogsCopiedStatus(true);
                                            setTimeout(() => setlogsCopiedStatus(false), 500);
                                        }}
                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition"
                                        title="Copy Preview URL"
                                    >
                                        <i className="ri-clipboard-line text-blue-300"></i>
                                        {logscopiedStatus && (
                                            <span className="absolute -translate-x-1/2 text-xs bg-slate-800 text-blue-400 px-2 py-1 rounded shadow border border-blue-500 z-10">Copied!</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setOutputLogs([])
                                            setClearStatus(true);
                                            setTimeout(() => setClearStatus(false), 500);
                                        }}
                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition"
                                        title="Copy Preview URL"
                                    >
                                        <i className="ri-delete-bin-6-line mr-1"></i>
                                        {clearStatus && (
                                            <span className="absolute -translate-x-1/2 text-xs bg-slate-800 text-blue-400 px-2 py-1 rounded shadow border border-blue-500 z-10">Cleared!</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div
                                className="flex-grow bg-slate-800 rounded-lg p-4 overflow-y-auto border border-slate-700 shadow-inner text-sm font-mono select-text"
                                style={{ maxHeight: '40vh', minHeight: '200px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                ref={el => {
                                    if (el) el.scrollTop = el.scrollHeight;
                                }}
                            >
                                {outputLogs.length === 0 ? (
                                    <span className="text-slate-500">No output logs yet...</span>
                                ) : (
                                    outputLogs.map((log, index) => {
                                        let color = 'text-slate-200';
                                        if (/error|fail|exception|not found|cannot|err/i.test(log)) color = 'text-red-400';
                                        else if (/warn|deprecated/i.test(log)) color = 'text-yellow-300';
                                        else if (/success|started|listening|ready/i.test(log)) color = 'text-green-400';
                                        else if (/info|install|setup|start|run/i.test(log)) color = 'text-blue-300';
                                        return (
                                            <div key={index} className={color + ' break-words'}>
                                                {log}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Editor Area - Only show when not viewing output logs */}
                    {activeTab !== 'output' && (
                        <div className="flex-grow flex w-full h-full bg-slate-900/80 rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
                            {/* Line Numbers */}
                            <div
                                ref={lineNumberRef}
                                className="line-numbers bg-slate-800/70 border-r border-slate-700/50 text-slate-500 text-sm font-mono select-none overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                style={{
                                    width: '3rem',
                                    userSelect: 'none',
                                    textAlign: 'right',
                                    height: '100%',
                                    position: 'relative',
                                    background: 'linear-gradient(90deg, #1e293b 90%, #334155 100%)',
                                    lineHeight: '1.5em',
                                    fontSize: '14px'
                                }}
                            >
                                {currentFile && getFileNodeByPath(fileTree, currentFile)?.contents?.split('\n').map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            height: '1.5em',
                                            lineHeight: '1.5em',
                                            transition: 'background 0.2s',
                                            padding: '0 0.5rem'
                                        }}
                                        className={`${activeLine === i + 1 ? 'bg-blue-900/40 text-blue-300 font-bold' : 'hover:bg-slate-700/40'}`}
                                    >
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                            {/* Code Editor */}
                            <div
                                className="flex-grow h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                style={{ position: 'relative' }}
                            >
                                <textarea
                                    ref={textareaRef}
                                    className="w-full h-full min-h-0 px-4 py-4 border-none outline-none font-mono text-sm bg-transparent text-slate-200 resize-none focus:ring-0 focus:outline-none"
                                    value={currentFile ? (getFileNodeByPath(fileTree, currentFile)?.contents || '') : ''}
                                    onChange={(e) => {
                                        // Update the nested fileTree immutably
                                        const updateTree = (tree, pathArr, value) => {
                                            if (pathArr.length === 1) {
                                                const fileName = pathArr[0];
                                                if (tree[fileName]?.file) {
                                                    return {
                                                        ...tree,
                                                        [fileName]: {
                                                            ...tree[fileName],
                                                            file: {
                                                                ...tree[fileName].file,
                                                                contents: value
                                                            }
                                                        }
                                                    };
                                                } else if (tree[fileName] && tree[fileName].contents !== undefined) {
                                                    return {
                                                        ...tree,
                                                        [fileName]: {
                                                            ...tree[fileName],
                                                            contents: value
                                                        }
                                                    };
                                                }
                                                return tree;
                                            }
                                            const [head, ...rest] = pathArr;
                                            if (!tree[head]) return tree;

                                            return {
                                                ...tree,
                                                [head]: {
                                                    ...tree[head],
                                                    directory: updateTree(tree[head].directory || {}, rest, value)
                                                }
                                            };
                                        };
                                        setFileTree(prev => {
                                            const updatedTree = updateTree(prev, currentFile.split('/'), e.target.value);

                                            // Sync with WebContainer if available
                                            if (webContainer) {
                                                webContainer.mount(updatedTree).catch(error => {
                                                    console.error('Failed to sync file tree with WebContainer:', error);
                                                });
                                            }

                                            return updatedTree;
                                        });
                                        updateActiveLine();
                                    }}
                                    spellCheck="false"
                                    style={{
                                        lineHeight: '1.5em',
                                        tabSize: 4,
                                        fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
                                        height: '100%',
                                        minHeight: 0,
                                        resize: 'none',
                                        overflow: 'auto',
                                        background: 'transparent',
                                        fontSize: '14px',
                                        padding: '0.5rem'
                                    }}
                                    onScroll={handleEditorScroll}
                                    onClick={updateActiveLine}
                                    onKeyUp={updateActiveLine}
                                />
                                <style>{`
                                    .line-numbers > div.bg-blue-900\/40 {
                                        border-left: 3px solid #3b82f6;
                                    }
                                `}</style>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* File Creation Modal */}
            {isCreatingFile && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-blue-300">Create New File</h2>
                            <button
                                onClick={() => {
                                    setIsCreatingFile(false);
                                    setNewFileName('');
                                    setSelectedFolderPath('');
                                }}
                                className="text-slate-400 hover:text-slate-200 transition p-2 hover:bg-slate-700 rounded-lg"
                            >
                                <i className="ri-close-line text-2xl"></i>
                            </button>
                        </div>
                        {selectedFolderPath && (
                            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                                <p className="text-sm text-slate-300">
                                    <span className="text-slate-400">Creating file in:</span> {selectedFolderPath}
                                </p>
                            </div>
                        )}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                File Name
                            </label>
                            <input
                                type="text"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateFile();
                                    } else if (e.key === 'Escape') {
                                        setIsCreatingFile(false);
                                        setNewFileName('');
                                        setSelectedFolderPath('');
                                    }
                                }}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter file name (e.g., app.js)"
                                autoFocus
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                Press Enter to create, Escape to cancel
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsCreatingFile(false);
                                    setNewFileName('');
                                    setSelectedFolderPath('');
                                }}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFile}
                                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition"
                                disabled={!newFileName.trim()}
                            >
                                Create File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Creation Modal */}
            {isCreatingFolder && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-green-300">Create New Folder</h2>
                            <button
                                onClick={() => {
                                    setIsCreatingFolder(false);
                                    setNewFolderName('');
                                    setSelectedFolderPath('');
                                }}
                                className="text-slate-400 hover:text-slate-200 transition p-2 hover:bg-slate-700 rounded-lg"
                            >
                                <i className="ri-close-line text-2xl"></i>
                            </button>
                        </div>
                        {selectedFolderPath && (
                            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                                <p className="text-sm text-slate-300">
                                    <span className="text-slate-400">Creating folder in:</span> {selectedFolderPath}
                                </p>
                            </div>
                        )}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Folder Name
                            </label>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateFolder();
                                    } else if (e.key === 'Escape') {
                                        setIsCreatingFolder(false);
                                        setNewFolderName('');
                                        setSelectedFolderPath('');
                                    }
                                }}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Enter folder name"
                                autoFocus
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                Press Enter to create, Escape to cancel
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsCreatingFolder(false);
                                    setNewFolderName('');
                                    setSelectedFolderPath('');
                                }}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow transition"
                                disabled={!newFolderName.trim()}
                            >
                                Create Folder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Output Preview Modal */}
            {isOutputModalOpen && iframeUrl && webContainer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="relative w-full max-w-4xl h-[80vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700 rounded-t-2xl">
                            <span className="text-blue-300 font-semibold text-base flex items-center gap-2">
                                <i className="ri-window-line text-lg" /> Output Preview
                            </span>
                            <div className="flex gap-2 items-center">
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setIframeUrl(iframeUrl);
                                            setReloadedStatus(true);
                                            setTimeout(() => setReloadedStatus(false), 1000);
                                        }}
                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition"
                                        title="Reload Preview"
                                    >
                                        <i className="ri-refresh-line text-blue-300"></i>
                                    </button>
                                    {reloadedStatus && (
                                        <span className="absolute left-1/2 -translate-x-1/2 top-10 text-xs bg-slate-800 text-green-400 px-2 py-1 rounded shadow border border-green-500 z-10">Reloaded!</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(iframeUrl);
                                            setopCopiedStatus(true);
                                            setTimeout(() => setopCopiedStatus(false), 1000);
                                        }}
                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition"
                                        title="Copy Preview URL"
                                    >
                                        <i className="ri-clipboard-line text-blue-300"></i>
                                    </button>
                                    {opcopiedStatus && (
                                        <span className="absolute left-1/2 -translate-x-1/2 top-10 text-xs bg-slate-800 text-blue-400 px-2 py-1 rounded shadow border border-blue-500 z-10">Copied!</span>
                                    )}
                                </div>
                                <a
                                    href={iframeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition"
                                    title="Open in new tab"
                                >
                                    <i className="ri-external-link-line text-blue-300"></i>
                                </a>
                                <button
                                    onClick={() => setIsOutputModalOpen(false)}
                                    className="p-1.5 bg-red-700 hover:bg-red-800 rounded transition ml-2"
                                    title="Close Preview"
                                >
                                    <i className="ri-close-line text-white text-lg"></i>
                                </button>
                            </div>
                        </div>
                        {/* Address Bar */}
                        <div className="address-bar flex items-center gap-2 px-6 py-2 bg-slate-700 border-b border-slate-800">
                            <input
                                type="text"
                                value={iframeUrl}
                                className="w-full p-2 px-4 bg-slate-600 text-slate-200 rounded focus:outline-none text-xs font-mono"
                                readOnly
                            />
                        </div>
                        {/* Preview Iframe */}
                        <div className="relative flex-grow bg-slate-900 rounded-b-2xl overflow-hidden flex items-center justify-center">
                            <iframe
                                src={iframeUrl}
                                className="w-full h-full min-h-[300px] border-0 rounded-b-2xl shadow-lg bg-white"
                                style={{ background: 'white' }}
                                onLoad={(e) => {
                                    e.target.style.opacity = 1;
                                }}
                                onError={(e) => {
                                    e.target.style.opacity = 0.5;
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project

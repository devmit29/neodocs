import React, { useCallback, useEffect, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import QuillCursors from 'quill-cursors';


export default function textEditor() {
  const { id: documentId } = useParams();

  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const [cursors, setCursors] = useState();
  
  
  useEffect(() => {
  const s = io('http://localhost:3001');
    setSocket(s);

    return () =>{
      s.disconnect();
    }
  }, [])

  useEffect(() => {
    if (socket == null || quill == null) return;
   
    socket.once('load-document', (document, numberOfUsers) => {
      console.log(numberOfUsers);
      quill.setContents(document);
      quill.enable();
    })

    socket.emit('get-document', documentId);
    
  }, [socket, quill, documentId])
  
  useEffect(() => {
    if (socket == null || quill == null) return;
    const handler = (delta) => {
      quill.updateContents(delta);
    }
    socket.on('receive-changes', handler);
    return () => {
      socket.off('receive-changes', handler);
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit('save-document', quill.getContents());
    }, 2000)

    return () => clearInterval(interval);
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return;
    const handler = (delta, oldDelta, source) => {
      if (source !== 'user') return 
      socket.emit('send-changes', delta);
    }
    quill.on('text-change', handler);
    
    return () => {
      quill.off('text-change', handler);
    }
  }, [socket, quill])

  useEffect(() => {
    if (!socket || !cursors) return;
  
    const handleCursorUpdate = ({ userId, userNumber, range }) => {
      console.log('Cursor update received:', { userId, userNumber, range });
      if (!range) return;
  
      cursors.createCursor(userId, `User ${userNumber}`, getColorForUser(userId));
      cursors.moveCursor(userId, range);
    };
  
    socket.on('cursor-position', handleCursorUpdate);
  
    return () => {
      socket.off('cursor-position', handleCursorUpdate);
    };
  }, [socket, cursors]);
  

  useEffect(() => {
    if (!socket || !quill) return;
  
    const updateCursor = () => {
      const range = quill.getSelection();
      if (range) {
        socket.emit('update-cursor', {
          userId: socket.id,
          range,
          documentId, // Ensure the documentId is sent to manage rooms correctly
        });
      }
    };
  
    quill.on('selection-change', updateCursor);
    return () => {
      quill.off('selection-change', updateCursor);
    };
  }, [socket, quill, documentId]);
  

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    
    wrapper.innerHTML = "";
    const editor = document.createElement('div');
    wrapper.append(editor);

    Quill.register('modules/cursors', QuillCursors);

    const q = new Quill(editor, {
      theme: 'snow',
      modules: {
        cursors: {
          template: '<div class="custom-cursor"><span class="cursor-name"></span></div>',
          hideDelayMs: 5000,
          hideSpeedMs: 0,
          selectionChangeSource: null,
          transformOnTextChange: true,
        },
      },
    })

    const cursorModule = q.getModule('cursors');
    setCursors(cursorModule);

    q.disable();
    q.setText('Loading...');
    setQuill(q);
  }, [])

  const getColorForUser = (userId) => {
    const colors = ['red', 'blue', 'green', 'purple', 'orange'];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
    return (
      <div className='container' ref={wrapperRef}>
          
    </div>
  );
}

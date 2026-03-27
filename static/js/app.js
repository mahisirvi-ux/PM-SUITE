/* ══════════════════════════════
   APP INITIALIZATION (app.js)
══════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Setup Chat Textarea Events
    const cta = document.getElementById('cta');
    if (cta) {
        // Send message on Enter key (unless holding shift for a new line)
        cta.addEventListener('keydown', e => { 
            if(e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                sendMsg(); 
            }
        });
        
        // Auto-resize the textarea as the user types
        cta.addEventListener('input', function() { 
            this.style.height = 'auto'; 
            this.style.height = Math.min(this.scrollHeight, 80) + 'px'; 
        });
    }

    // 2. Initialize Default Agent
    if(typeof setAgent === "function") {
        setAgent('planner', null);
    }
    
    // 3. Kick off the application by loading data from FastAPI
    if(typeof loadInitialData === "function") {
        loadInitialData();
    }
});
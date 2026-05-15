import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-code-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorModule, MatButtonModule, MatIconModule],
  template: `
    <div class="workspace-container">
      <!-- Header -->
      <div class="editor-header">
        <div class="tabs">
          <div class="tab active">main.py</div>
        </div>
        <div class="actions">
          <!-- Error Badge -->
          <div class="error-badge" *ngIf="errorCount > 0" (click)="switchToProblems()">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorCount }}</span>
          </div>

          <button mat-button class="run-btn" (click)="runCode()" [disabled]="isRunning">
            <mat-icon>{{ isRunning ? 'sync' : 'play_arrow' }}</mat-icon> 
            {{ isRunning ? 'Running...' : 'Run Code' }}
          </button>
          <button mat-button class="analyze-btn" (click)="triggerAnalysis()" [disabled]="isAnalyzing">
            <mat-icon>auto_fix_high</mat-icon> Analyze Inline
          </button>
        </div>
      </div>
      
      <!-- Editor Body -->
      <div class="editor-body-container">
        <div class="editor-body" (click)="focusEditor()">
          <ngx-monaco-editor 
            class="monaco-container" 
            [options]="editorOptions" 
            [(ngModel)]="code" 
            (ngModelChange)="onCodeChange($event)"
            (onInit)="onInit($event)">
          </ngx-monaco-editor>
        </div>

        <!-- Console Area -->
        <div class="console-area" *ngIf="executionResult || isRunning || errorCount > 0 || activeTab === 'problems'">
          <div class="console-tabs">
            <div class="console-tab" [class.active]="activeTab === 'output'" (click)="activeTab = 'output'">
              Output
            </div>
            <div class="console-tab" [class.active]="activeTab === 'problems'" (click)="activeTab = 'problems'">
              Problems <span class="problem-count" *ngIf="errorCount > 0">{{ errorCount }}</span>
            </div>
            <span class="spacer"></span>
            <button mat-icon-button (click)="clearConsole()" class="clear-btn"><mat-icon>delete_sweep</mat-icon></button>
          </div>

          <div class="console-content" #consoleContent>
            <!-- Output View -->
            <ng-container *ngIf="activeTab === 'output'">
              <pre *ngIf="executionResult?.stdout" class="stdout">{{ executionResult.stdout }}</pre>
              <pre *ngIf="executionResult?.stderr" class="stderr">{{ executionResult.stderr }}</pre>
              <div *ngIf="isRunning" class="running-indicator">Executing...</div>
              <div *ngIf="executionResult" class="exit-status" [class.error]="executionResult.exit_code !== 0">
                Process finished with exit code {{ executionResult.exit_code }}
              </div>
              <div *ngIf="!executionResult && !isRunning" class="empty-msg">No output to show. Run the code to see results.</div>
            </ng-container>

            <!-- Problems View -->
            <ng-container *ngIf="activeTab === 'problems'">
              <div class="problems-list">
                <div class="problem-item" *ngFor="let m of markers" (click)="goToMarker(m)">
                  <mat-icon class="err-icon">error</mat-icon>
                  <span class="err-msg">{{ m.message }}</span>
                  <span class="err-loc">Line {{ m.startLineNumber }}, Col {{ m.startColumn }}</span>
                </div>
                <div *ngIf="markers.length === 0" class="empty-msg">No problems detected in the current file.</div>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
      
      <!-- AI Suggestion Panel -->
      <div class="suggestion-panel" *ngIf="activeSuggestion">
        <div class="suggestion-header">
          <mat-icon class="ai-icon">psychology</mat-icon>
          <span>AI Suggestion at Line {{ activeLineNumber }}</span>
          <button mat-icon-button (click)="dismissSuggestion()"><mat-icon>close</mat-icon></button>
        </div>
        <div class="suggestion-content">
          <p class="explanation">{{ activeSuggestion.explanation }}</p>
          <div class="diff-view">
            <div class="original">- {{ activeSuggestion.original_line }}</div>
            <div class="suggested">+ {{ activeSuggestion.suggested_line }}</div>
          </div>
          <button mat-raised-button color="primary" class="accept-btn" (click)="acceptSuggestion()">
            Accept Fix
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workspace-container {
      display: flex;
      flex-direction: column;
      height: 750px;
      border-radius: 12px;
      overflow: hidden;
      background: #1e1e1e;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #252526;
      border-bottom: 1px solid #333;
      height: 45px;
      z-index: 10;
    }

    .tabs { display: flex; height: 100%; }
    .tab {
      padding: 0 20px;
      display: flex;
      align-items: center;
      color: #9cdcfe;
      font-family: monospace;
      border-top: 2px solid transparent;
      cursor: pointer;
      background: #2d2d2d;
    }
    .tab.active {
      background: #1e1e1e;
      border-top: 2px solid #007acc;
    }

    .actions { display: flex; gap: 12px; padding-right: 10px; align-items: center; }
    
    .error-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(241, 76, 76, 0.15);
      color: #f14c4c;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid rgba(241, 76, 76, 0.3);
    }
    .error-badge:hover {
      background: rgba(241, 76, 76, 0.25);
    }
    .error-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .run-btn { color: #73c991; }
    .analyze-btn { color: #007acc; }

    .editor-body-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .editor-body {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #1e1e1e;
      cursor: text;
      min-height: 200px;
    }

    .monaco-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: block;
      pointer-events: auto !important;
    }
    
    ::ng-deep .monaco-container .editor-container {
      height: 100% !important;
      width: 100% !important;
      pointer-events: auto !important;
    }

    /* Console Styles */
    .console-area {
      height: 250px;
      background: #0a0a0a;
      border-top: 1px solid #333;
      display: flex;
      flex-direction: column;
      font-family: 'Fira Code', 'Consolas', monospace;
    }
    .console-tabs {
      display: flex;
      background: #1a1a1a;
      padding: 0 10px;
      border-bottom: 1px solid #222;
      height: 35px;
    }
    .console-tab {
      padding: 0 15px;
      display: flex;
      align-items: center;
      color: #777;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .console-tab.active {
      color: #ddd;
      border-bottom-color: #007acc;
    }
    .problem-count {
      margin-left: 6px;
      background: #f14c4c;
      color: white;
      border-radius: 10px;
      padding: 0 6px;
      font-size: 0.7rem;
      font-weight: 800;
    }
    .spacer { flex: 1; }
    .clear-btn { color: #555; }
    
    .console-content {
      flex: 1;
      padding: 12px 16px;
      overflow-y: auto;
      font-size: 0.9rem;
    }
    pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
    .stdout { color: #dcdcdc; }
    .stderr { color: #f14c4c; }
    .exit-status { margin-top: 12px; color: #73c991; font-size: 0.8rem; }
    .exit-status.error { color: #f14c4c; }
    .running-indicator { color: #e1b12c; font-style: italic; }
    .empty-msg { color: #444; text-align: center; margin-top: 40px; font-style: italic; }

    /* Problems List */
    .problems-list { display: flex; flex-direction: column; gap: 8px; }
    .problem-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .problem-item:hover { background: rgba(255, 255, 255, 0.05); }
    .err-icon { color: #f14c4c; font-size: 16px; width: 16px; height: 16px; }
    .err-msg { flex: 1; color: #ccc; }
    .err-loc { color: #666; font-size: 0.8rem; }

    .suggestion-panel {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 400px;
      background: rgba(30, 30, 30, 0.95);
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }
    .suggestion-header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: #2d2d2d;
      border-bottom: 1px solid #444;
      font-weight: 500;
      color: #e0e0e0;
    }
    .suggestion-header span { flex: 1; margin-left: 8px; }
    .ai-icon { color: #b39ddb; }
    .suggestion-content { padding: 16px; }
    .explanation { margin: 0 0 12px 0; color: #ccc; font-size: 0.9rem; }
    .diff-view {
      font-family: 'Fira Code', monospace;
      font-size: 0.85rem;
      background: #111;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 16px;
    }
    .original { color: #f14c4c; text-decoration: line-through; }
    .suggested { color: #73c991; }
    .accept-btn { width: 100%; background: #007acc; color: white; }
  `]
})
export class CodeWorkspaceComponent implements OnInit, OnDestroy {
  @ViewChild('consoleContent') consoleContent!: ElementRef;

  editorOptions = {
    theme: 'vs-dark',
    language: 'python',
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    readOnly: false,
    cursorBlinking: 'smooth',
    scrollBeyondLastLine: false
  };
  
  code = '# Welcome to DKnex AI Workspace\n\ndef hello_world():\n    print("Hello, AI!")\n\nhello_world()\n';
  editor: any;
  
  codeChanged$ = new Subject<string>();
  subscription!: Subscription;
  
  isAnalyzing = false;
  activeSuggestion: any = null;
  activeLineNumber = 0;

  // Execution & Console state
  isRunning = false;
  executionResult: any = null;
  activeTab: 'output' | 'problems' = 'output';
  
  // Problems state
  markers: any[] = [];
  errorCount = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.subscription = this.codeChanged$.pipe(
      debounceTime(2000)
    ).subscribe(() => {
      this.triggerAnalysis();
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onInit(editor: any) {
    this.editor = editor;
    console.log("Monaco Editor Initialized");
    
    // Listen for marker changes (errors/warnings)
    const model = this.editor.getModel();
    if (model) {
      this.updateMarkers();
      model.onDidChangeDecorations(() => {
        this.updateMarkers();
      });
    }

    setTimeout(() => {
      this.editor.layout();
      this.editor.focus(); 
    }, 200);
  }

  updateMarkers() {
    if (!this.editor) return;
    const model = this.editor.getModel();
    if (!model) return;

    // Get only Error level markers (severity 8)
    const allMarkers = (window as any).monaco.editor.getModelMarkers({ resource: model.uri });
    this.markers = allMarkers.filter((m: any) => m.severity === 8);
    this.errorCount = this.markers.length;
  }

  switchToProblems() {
    this.activeTab = 'problems';
    this.scrollToBottom();
  }

  goToMarker(marker: any) {
    if (this.editor) {
      this.editor.revealLineInCenter(marker.startLineNumber);
      this.editor.setPosition({ lineNumber: marker.startLineNumber, column: marker.startColumn });
      this.editor.focus();
    }
  }

  focusEditor() {
    if (this.editor) {
      this.editor.focus();
    }
  }

  onCodeChange(newCode: string) {
    this.codeChanged$.next(newCode);
    this.activeSuggestion = null;
  }

  runCode() {
    this.isRunning = true;
    this.executionResult = null;
    this.activeTab = 'output'; // Auto-switch to output on run
    
    const payload = {
      code: this.code,
      language: 'python'
    };
    
    this.http.post<any>('http://localhost:8001/run-code', payload).subscribe({
      next: (res) => {
        this.isRunning = false;
        this.executionResult = res;
        this.scrollToBottom();
      },
      error: (err) => {
        this.isRunning = false;
        this.executionResult = {
          stdout: "",
          stderr: "Failed to connect to execution service.",
          exit_code: 1
        };
      }
    });
  }

  clearConsole() {
    this.executionResult = null;
    this.isRunning = false;
    // We don't clear markers because they come from the editor itself
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.consoleContent) {
        const el = this.consoleContent.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }

  triggerAnalysis() {
    if (!this.editor) return;
    const position = this.editor.getPosition();
    const lineNum = position ? position.lineNumber : 1;
    this.activeLineNumber = lineNum;
    this.isAnalyzing = true;
    
    const payload = {
      code: this.code,
      line_number: lineNum,
      language: 'python'
    };
    
    this.http.post<any>('http://localhost:8001/inline-fix', payload).subscribe({
      next: (res) => {
        this.isAnalyzing = false;
        if (res.has_suggestion) {
          this.activeSuggestion = res;
        }
      },
      error: (err) => {
        this.isAnalyzing = false;
        console.error("Inline analysis failed:", err);
      }
    });
  }
  
  acceptSuggestion() {
    if (!this.activeSuggestion || !this.editor) return;
    const lineNum = this.activeLineNumber;
    const newText = this.activeSuggestion.suggested_line;
    const model = this.editor.getModel();
    const range = new (window as any).monaco.Range(lineNum, 1, lineNum, model.getLineMaxColumn(lineNum));
    
    this.editor.executeEdits('ai-assistant', [{
      range: range,
      text: newText,
      forceMoveMarkers: true
    }]);
    this.dismissSuggestion();
  }
  
  dismissSuggestion() {
    this.activeSuggestion = null;
  }
}



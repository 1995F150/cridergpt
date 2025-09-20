import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, Video, VideoOff, RotateCcw, Download, Send, X } from 'lucide-react';

interface CameraSystemProps {
  onPhotoCapture?: (imageData: string) => void;
  onVideoCapture?: (videoBlob: Blob) => void;
  mode?: 'photo' | 'video' | 'both';
  showControls?: boolean;
  className?: string;
}

export function CameraSystem({ 
  onPhotoCapture,
  onVideoCapture,
  mode = 'both',
  showControls = true,
  className = ''
}: CameraSystemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();

  // Request camera permissions
  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      console.log('📷 Requesting camera permissions...');
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: mode === 'video' || mode === 'both'
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setHasPermission(true);
      
      console.log('✅ Camera permissions granted');
      
      toast({
        title: "Camera Ready",
        description: "Camera permissions granted successfully"
      });
      
    } catch (error) {
      console.error('❌ Camera permission error:', error);
      
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Camera not supported in this browser.';
        }
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setHasPermission(false);
      console.log('📷 Camera stopped');
    }
  };

  // Switch between front and back camera
  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    if (hasPermission) {
      stopCamera();
      // Small delay to ensure cleanup
      setTimeout(() => {
        requestPermissions();
      }, 100);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(imageData);
    
    console.log('📸 Photo captured');
    
    toast({
      title: "Photo Captured!",
      description: "Your photo is ready to share"
    });
    
    if (onPhotoCapture) {
      onPhotoCapture(imageData);
    }
  };

  // Start video recording
  const startRecording = () => {
    if (!stream) return;
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    chunksRef.current = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      
      console.log('🎥 Video recording completed, size:', blob.size);
      
      if (onVideoCapture) {
        onVideoCapture(blob);
      }
      
      toast({
        title: "Video Recorded!",
        description: "Your video is ready to share"
      });
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    
    console.log('🎥 Video recording started');
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('🎥 Video recording stopped');
    }
  };

  // Download captured photo
  const downloadPhoto = () => {
    if (!capturedPhoto) return;
    
    const link = document.createElement('a');
    link.download = `photo-${Date.now()}.jpg`;
    link.href = capturedPhoto;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Camera Feed */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-0">
          {!hasPermission ? (
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center space-y-4">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Camera Access Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow camera access to take photos and videos
                  </p>
                </div>
                <Button 
                  onClick={requestPermissions} 
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? 'Requesting...' : 'Enable Camera'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
              />
              
              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  REC
                </div>
              )}
              
              {/* Camera facing indicator */}
              <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {facingMode === 'user' ? 'Front' : 'Back'} Camera
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      {showControls && hasPermission && (
        <div className="flex justify-center gap-4">
          {/* Photo capture */}
          {(mode === 'photo' || mode === 'both') && (
            <Button
              onClick={capturePhoto}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Camera className="h-5 w-5 mr-2" />
              Photo
            </Button>
          )}
          
          {/* Video recording */}
          {(mode === 'video' || mode === 'both') && (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className={!isRecording ? "bg-red-500 hover:bg-red-600" : ""}
            >
              {isRecording ? (
                <>
                  <VideoOff className="h-5 w-5 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 mr-2" />
                  Record
                </>
              )}
            </Button>
          )}
          
          {/* Switch camera */}
          <Button
            onClick={switchCamera}
            variant="outline"
            size="lg"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          
          {/* Stop camera */}
          <Button
            onClick={stopCamera}
            variant="outline"
            size="lg"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Captured Photo Preview */}
      {capturedPhoto && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <img 
                src={capturedPhoto} 
                alt="Captured photo" 
                className="w-full max-w-md mx-auto rounded-lg"
              />
              <div className="flex justify-center gap-2">
                <Button
                  onClick={downloadPhoto}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => setCapturedPhoto(null)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
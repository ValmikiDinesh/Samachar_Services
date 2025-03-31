const submitArticle = async () => {
    // Collect the text data
    const articleData = {
      NewsHeadline: newsHeadline,
      User: user,
      PublishedBy: publishedBy,
      NewsDscr: newsDscr,
      Tags: tags,
    };
  
    // Create a FormData object to send data as multi-part form data
    const formData = new FormData();
    formData.append('NewsHeadline', newsHeadline);
    formData.append('User', user);
    formData.append('PublishedBy', publishedBy);
    formData.append('NewsDscr', newsDscr);
    formData.append('Tags', tags);
  
    // If an image is selected, append it to the FormData
    if (image) {
      const imageUri = image; // This is the URI of the selected image
      const file = {
        uri: imageUri,
        type: 'image/png',  // Or the appropriate MIME type for your image
        name: 'image.png',  // You can give the image any name you want
      };
  
      formData.append('Image', file);
    }
  
    // Define the API endpoint
    const API_URL = 'http://10.0.2.2:4000/upload';  // Replace with your backend URL
  
    // Send the request to the API
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data', // Important to set the correct content type
        },
        body: formData, // The FormData object containing both text and the image
      });
  
      const result = await response.json();
  
      if (response.ok) {
        // Handle successful submission
        Alert.alert('Success', 'Article submitted successfully');
        resetForm(); // Reset form after submission
      } else {
        // Handle any errors returned from the server
        Alert.alert('Error', result.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error submitting article:', error);
      Alert.alert('Error', 'Failed to submit article');
    }
  };
  
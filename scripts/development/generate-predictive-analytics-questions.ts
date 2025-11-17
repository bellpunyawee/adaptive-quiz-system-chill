/**
 * Generate 500 Predictive Analytics Questions
 *
 * Topics:
 * 1. Python Fundamentals for Data Science
 * 2. Data Preprocessing & Feature Engineering
 * 3. Classification Algorithms
 * 4. Regression Analysis
 * 5. Time Series Forecasting
 * 6. Model Evaluation & Validation
 * 7. Ensemble Methods
 * 8. Applications of Predictive Analytics
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Topics/Cells for Predictive Analytics
const TOPICS = [
  {
    name: 'Python Fundamentals for Data Science',
    weight: 0.12,
    description: 'NumPy, Pandas, Matplotlib, basic programming'
  },
  {
    name: 'Data Preprocessing & Feature Engineering',
    weight: 0.15,
    description: 'Data cleaning, normalization, feature selection'
  },
  {
    name: 'Classification Algorithms',
    weight: 0.18,
    description: 'Logistic Regression, Decision Trees, SVM, KNN'
  },
  {
    name: 'Regression Analysis',
    weight: 0.15,
    description: 'Linear Regression, Polynomial, Ridge, Lasso'
  },
  {
    name: 'Time Series Forecasting',
    weight: 0.15,
    description: 'ARIMA, SARIMA, Prophet, LSTM'
  },
  {
    name: 'Model Evaluation & Validation',
    weight: 0.12,
    description: 'Cross-validation, metrics, overfitting'
  },
  {
    name: 'Ensemble Methods',
    weight: 0.08,
    description: 'Random Forest, Gradient Boosting, Stacking'
  },
  {
    name: 'Applications of Predictive Analytics',
    weight: 0.05,
    description: 'Business applications, case studies'
  },
];

// Generate difficulty using Gaussian distribution
// Mean = 0 (medium difficulty), SD = 1.0
function generateDifficulty(): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // Constrain to reasonable IRT range: [-2.5, 2.5]
  return Math.max(-2.5, Math.min(2.5, z * 0.8));
}

// Generate discrimination (quality of question)
// Higher discrimination = better question
function generateDiscrimination(): number {
  // Slight right-skew: most questions are good quality
  const base = 0.8 + Math.random() * 1.5; // Range: 0.8 to 2.3
  return Math.min(2.5, base);
}

// Generate guessing parameter for 3PL
// Multiple choice = some guessing probability
function generateGuessing(): number {
  // Typically 0.15-0.25 for 4-option questions
  return 0.15 + Math.random() * 0.10; // Range: 0.15 to 0.25
}

// Question bank by topic
const QUESTION_BANK = {
  'Python Fundamentals for Data Science': [
    {
      text: 'What is the correct way to import NumPy with the standard alias?',
      options: [
        'import numpy as np',
        'import np as numpy',
        'from numpy import *',
        'import numpy'
      ],
      correctIndex: 0,
      explanation: 'The standard convention is "import numpy as np" for concise usage.'
    },
    {
      text: 'Which Pandas function is used to read a CSV file?',
      options: [
        'pd.read_csv()',
        'pd.load_csv()',
        'pd.import_csv()',
        'pd.open_csv()'
      ],
      correctIndex: 0,
      explanation: 'pd.read_csv() is the standard function to read CSV files into a DataFrame.'
    },
    {
      text: 'How do you select a column named "age" from a DataFrame df?',
      options: [
        'df["age"] or df.age',
        'df.select("age")',
        'df.column("age")',
        'df.get("age")'
      ],
      correctIndex: 0,
      explanation: 'You can use bracket notation df["age"] or dot notation df.age to select columns.'
    },
    {
      text: 'What does the .head() method return in Pandas?',
      options: [
        'First 5 rows by default',
        'Column headers only',
        'First row only',
        'Last 5 rows'
      ],
      correctIndex: 0,
      explanation: '.head() returns the first 5 rows by default, useful for quick data inspection.'
    },
    {
      text: 'Which NumPy function creates an array of zeros?',
      options: [
        'np.zeros()',
        'np.empty()',
        'np.zero_array()',
        'np.new_array()'
      ],
      correctIndex: 0,
      explanation: 'np.zeros() creates an array filled with zeros of specified shape.'
    },
    {
      text: 'How do you check the shape of a NumPy array "arr"?',
      options: [
        'arr.shape',
        'arr.size()',
        'arr.dimensions()',
        'len(arr)'
      ],
      correctIndex: 0,
      explanation: 'The .shape attribute returns a tuple representing the dimensions of the array.'
    },
    {
      text: 'What is the output of np.arange(0, 10, 2)?',
      options: [
        '[0, 2, 4, 6, 8]',
        '[0, 2, 4, 6, 8, 10]',
        '[2, 4, 6, 8, 10]',
        '[0, 1, 2, 3, 4]'
      ],
      correctIndex: 0,
      explanation: 'np.arange(start, stop, step) generates values from 0 to 10 (exclusive) with step 2.'
    },
    {
      text: 'Which method removes rows with missing values in a DataFrame?',
      options: [
        'df.dropna()',
        'df.remove_na()',
        'df.delete_missing()',
        'df.filter_na()'
      ],
      correctIndex: 0,
      explanation: 'dropna() removes rows containing any NaN values by default.'
    },
    {
      text: 'How do you create a list comprehension that squares numbers 1-5?',
      options: [
        '[x**2 for x in range(1, 6)]',
        '[x^2 for x in range(1, 5)]',
        'square(range(1, 5))',
        'map(lambda x: x**2, range(5))'
      ],
      correctIndex: 0,
      explanation: 'List comprehension syntax: [expression for item in iterable]'
    },
    {
      text: 'What does the describe() method provide for a DataFrame?',
      options: [
        'Statistical summary (mean, std, min, max, etc.)',
        'Data types of columns',
        'Missing value count',
        'Column names'
      ],
      correctIndex: 0,
      explanation: 'describe() provides statistical summary including count, mean, std, quartiles.'
    },
  ],

  'Data Preprocessing & Feature Engineering': [
    {
      text: 'What is the purpose of data normalization?',
      options: [
        'Scale features to a common range (e.g., 0-1)',
        'Remove duplicate records',
        'Convert categorical to numerical',
        'Fill missing values'
      ],
      correctIndex: 0,
      explanation: 'Normalization scales features to a common range, preventing features with larger scales from dominating.'
    },
    {
      text: 'Which technique is used to handle missing numerical data by using the mean?',
      options: [
        'Mean imputation',
        'Forward fill',
        'Backward fill',
        'Interpolation'
      ],
      correctIndex: 0,
      explanation: 'Mean imputation replaces missing values with the mean of the available values.'
    },
    {
      text: 'What is one-hot encoding used for?',
      options: [
        'Converting categorical variables to binary vectors',
        'Scaling numerical features',
        'Removing outliers',
        'Feature selection'
      ],
      correctIndex: 0,
      explanation: 'One-hot encoding creates binary columns for each category in a categorical variable.'
    },
    {
      text: 'What does StandardScaler do in scikit-learn?',
      options: [
        'Standardizes features by removing mean and scaling to unit variance',
        'Scales features to range [0, 1]',
        'Removes outliers',
        'Fills missing values'
      ],
      correctIndex: 0,
      explanation: 'StandardScaler transforms features to have mean=0 and std=1 (z-score normalization).'
    },
    {
      text: 'Which method detects outliers using 1.5 * IQR rule?',
      options: [
        'Interquartile Range (IQR) method',
        'Z-score method',
        'DBSCAN clustering',
        'Principal Component Analysis'
      ],
      correctIndex: 0,
      explanation: 'IQR method: values < Q1 - 1.5*IQR or > Q3 + 1.5*IQR are considered outliers.'
    },
    {
      text: 'What is feature scaling important for in machine learning?',
      options: [
        'Algorithms like KNN and SVM that use distance metrics',
        'Decision trees',
        'Random forests only',
        'Text classification'
      ],
      correctIndex: 0,
      explanation: 'Distance-based algorithms are sensitive to feature scale; scaling ensures fair contribution.'
    },
    {
      text: 'What is the difference between normalization and standardization?',
      options: [
        'Normalization scales to [0,1], standardization to mean=0 std=1',
        'They are the same thing',
        'Normalization is for text, standardization for numbers',
        'Standardization scales to [0,1], normalization to mean=0'
      ],
      correctIndex: 0,
      explanation: 'Normalization (MinMaxScaler) scales to range, standardization (StandardScaler) uses z-scores.'
    },
    {
      text: 'Which technique creates new features by combining existing ones?',
      options: [
        'Feature engineering',
        'Feature selection',
        'Dimensionality reduction',
        'Data augmentation'
      ],
      correctIndex: 0,
      explanation: 'Feature engineering involves creating new meaningful features from existing data.'
    },
    {
      text: 'What is label encoding?',
      options: [
        'Converting categorical labels to numerical values',
        'Creating new labels for data',
        'Encoding text as vectors',
        'Scaling labels to [0, 1]'
      ],
      correctIndex: 0,
      explanation: 'Label encoding assigns a unique integer to each category (e.g., Red=0, Blue=1, Green=2).'
    },
    {
      text: 'Why should you apply transformations (like scaling) after train-test split?',
      options: [
        'To prevent data leakage from test set to training set',
        'To save computation time',
        'To improve model accuracy',
        'It doesn\'t matter when you apply them'
      ],
      correctIndex: 0,
      explanation: 'Fitting scaler on entire dataset leaks information from test set, inflating performance metrics.'
    },
  ],

  'Classification Algorithms': [
    {
      text: 'What does logistic regression predict?',
      options: [
        'Probability of class membership (0 to 1)',
        'Continuous numerical values',
        'Categories without probabilities',
        'Time series values'
      ],
      correctIndex: 0,
      explanation: 'Logistic regression outputs probabilities using the sigmoid function, typically for binary classification.'
    },
    {
      text: 'What is the decision boundary in a classification problem?',
      options: [
        'The line/surface separating different classes',
        'The threshold for probability cutoff',
        'The maximum value a feature can have',
        'The error margin'
      ],
      correctIndex: 0,
      explanation: 'Decision boundary is the hypersurface that partitions the feature space into class regions.'
    },
    {
      text: 'Which algorithm is based on the concept of "nearest neighbors"?',
      options: [
        'K-Nearest Neighbors (KNN)',
        'Logistic Regression',
        'Decision Trees',
        'Naive Bayes'
      ],
      correctIndex: 0,
      explanation: 'KNN classifies based on the majority class among k closest training examples.'
    },
    {
      text: 'What is the kernel trick in Support Vector Machines (SVM)?',
      options: [
        'Mapping data to higher dimensions to find linear separation',
        'A method to reduce training time',
        'A technique for feature selection',
        'A way to handle missing data'
      ],
      correctIndex: 0,
      explanation: 'Kernel trick implicitly maps data to higher dimensions where linear separation is possible.'
    },
    {
      text: 'What is overfitting in classification models?',
      options: [
        'Model performs well on training data but poorly on new data',
        'Model performs poorly on all data',
        'Model is too simple',
        'Model has too few parameters'
      ],
      correctIndex: 0,
      explanation: 'Overfitting occurs when model learns noise and specifics of training data, failing to generalize.'
    },
    {
      text: 'What is the purpose of the sigmoid function in logistic regression?',
      options: [
        'Map linear combination of features to probability [0, 1]',
        'Calculate the slope of the line',
        'Normalize feature values',
        'Select important features'
      ],
      correctIndex: 0,
      explanation: 'Sigmoid function: σ(z) = 1/(1+e^(-z)) squashes output to probability range [0,1].'
    },
    {
      text: 'Which metric is NOT suitable for imbalanced classification problems?',
      options: [
        'Accuracy',
        'F1-score',
        'Precision',
        'Recall'
      ],
      correctIndex: 0,
      explanation: 'Accuracy can be misleading with imbalanced data; a model predicting majority class always gets high accuracy.'
    },
    {
      text: 'What does the "max_depth" parameter control in Decision Trees?',
      options: [
        'Maximum depth of the tree (number of levels)',
        'Maximum number of features to consider',
        'Maximum number of samples required to split',
        'Maximum accuracy threshold'
      ],
      correctIndex: 0,
      explanation: 'max_depth limits tree depth to prevent overfitting by controlling model complexity.'
    },
    {
      text: 'What is the C parameter in SVM?',
      options: [
        'Regularization parameter controlling margin vs. misclassification tradeoff',
        'Number of support vectors',
        'Kernel coefficient',
        'Learning rate'
      ],
      correctIndex: 0,
      explanation: 'C controls tradeoff: small C = wide margin (more misclassifications), large C = narrow margin (fewer errors).'
    },
    {
      text: 'Which assumption does Naive Bayes classifier make?',
      options: [
        'Features are conditionally independent given the class',
        'Features are normally distributed',
        'Classes are equally probable',
        'Data is linearly separable'
      ],
      correctIndex: 0,
      explanation: 'Naive Bayes assumes features are independent given class (strong but often unrealistic assumption).'
    },
  ],

  'Regression Analysis': [
    {
      text: 'What is the goal of linear regression?',
      options: [
        'Find the best-fit line that minimizes prediction error',
        'Classify data into categories',
        'Cluster similar data points',
        'Reduce dimensionality'
      ],
      correctIndex: 0,
      explanation: 'Linear regression finds parameters that minimize sum of squared residuals (errors).'
    },
    {
      text: 'What does R² (R-squared) measure?',
      options: [
        'Proportion of variance in dependent variable explained by model',
        'Average prediction error',
        'Correlation between two variables',
        'Number of outliers'
      ],
      correctIndex: 0,
      explanation: 'R² ranges from 0 to 1; higher values indicate better fit (variance explained by model).'
    },
    {
      text: 'What is multicollinearity in regression?',
      options: [
        'High correlation between independent variables',
        'Non-linear relationship between variables',
        'Missing values in dataset',
        'Outliers affecting the model'
      ],
      correctIndex: 0,
      explanation: 'Multicollinearity makes it difficult to isolate individual effects of correlated predictors.'
    },
    {
      text: 'Which method does Ridge Regression use for regularization?',
      options: [
        'L2 penalty (sum of squared coefficients)',
        'L1 penalty (sum of absolute coefficients)',
        'Elastic Net penalty',
        'No regularization'
      ],
      correctIndex: 0,
      explanation: 'Ridge adds α∑β² penalty to loss function, shrinking coefficients but not to zero.'
    },
    {
      text: 'What is the main difference between Ridge and Lasso regression?',
      options: [
        'Lasso can shrink coefficients to exactly zero (feature selection)',
        'Ridge is faster to compute',
        'Lasso only works with binary data',
        'Ridge requires more data'
      ],
      correctIndex: 0,
      explanation: 'Lasso (L1) can zero out coefficients (feature selection), Ridge (L2) only shrinks them.'
    },
    {
      text: 'What is polynomial regression?',
      options: [
        'Fitting a polynomial curve (e.g., quadratic) to the data',
        'Using multiple linear models',
        'Regression with categorical variables',
        'Time series forecasting'
      ],
      correctIndex: 0,
      explanation: 'Polynomial regression extends linear model by adding polynomial terms (x², x³, etc.).'
    },
    {
      text: 'What does heteroscedasticity mean in regression?',
      options: [
        'Non-constant variance of residuals across values',
        'Linear relationship between variables',
        'Normal distribution of errors',
        'Equal sample sizes'
      ],
      correctIndex: 0,
      explanation: 'Heteroscedasticity violates constant variance assumption, affecting inference and confidence intervals.'
    },
    {
      text: 'What is the purpose of cross-validation in regression?',
      options: [
        'Assess model performance on unseen data and detect overfitting',
        'Select the best features',
        'Normalize the data',
        'Handle missing values'
      ],
      correctIndex: 0,
      explanation: 'Cross-validation splits data into folds, training on some and validating on others to estimate generalization.'
    },
    {
      text: 'What is Mean Absolute Error (MAE)?',
      options: [
        'Average of absolute differences between predicted and actual values',
        'Square root of average squared errors',
        'Percentage of variance explained',
        'Correlation coefficient'
      ],
      correctIndex: 0,
      explanation: 'MAE = (1/n)∑|yᵢ - ŷᵢ|, robust to outliers compared to MSE.'
    },
    {
      text: 'When should you use Elastic Net regression?',
      options: [
        'When you want both L1 and L2 regularization benefits',
        'Only for time series data',
        'When there are no correlated features',
        'For classification problems'
      ],
      correctIndex: 0,
      explanation: 'Elastic Net combines Ridge (L2) and Lasso (L1), useful with correlated features and need for feature selection.'
    },
  ],

  'Time Series Forecasting': [
    {
      text: 'What is a time series?',
      options: [
        'Data points indexed in time order',
        'Cross-sectional data at one point in time',
        'Random scattered observations',
        'Categorical data over time'
      ],
      correctIndex: 0,
      explanation: 'Time series consists of observations recorded sequentially over time with temporal dependence.'
    },
    {
      text: 'What does "stationary" mean in time series?',
      options: [
        'Statistical properties (mean, variance) are constant over time',
        'Data has no missing values',
        'Data is normally distributed',
        'No outliers present'
      ],
      correctIndex: 0,
      explanation: 'Stationary series has constant mean, variance, and autocorrelation structure over time.'
    },
    {
      text: 'What is the purpose of differencing in time series?',
      options: [
        'Remove trend and make series stationary',
        'Smooth the data',
        'Fill missing values',
        'Scale the data'
      ],
      correctIndex: 0,
      explanation: 'Differencing (yₜ - yₜ₋₁) removes trends and seasonality to achieve stationarity.'
    },
    {
      text: 'What does ARIMA stand for?',
      options: [
        'AutoRegressive Integrated Moving Average',
        'Automated Regression Integration Model Analysis',
        'Advanced Recursive Iteration Method',
        'Adaptive Real-time Interval Modeling'
      ],
      correctIndex: 0,
      explanation: 'ARIMA(p,d,q): p=AR order, d=differencing degree, q=MA order.'
    },
    {
      text: 'What is seasonality in time series?',
      options: [
        'Regular patterns that repeat at fixed intervals',
        'Random fluctuations',
        'Long-term trend',
        'One-time events'
      ],
      correctIndex: 0,
      explanation: 'Seasonality is periodic variation (daily, weekly, yearly) due to calendar or seasonal factors.'
    },
    {
      text: 'What does the autocorrelation function (ACF) measure?',
      options: [
        'Correlation between observations at different time lags',
        'Correlation between different time series',
        'Variance of the series',
        'Mean of the series'
      ],
      correctIndex: 0,
      explanation: 'ACF shows how current values correlate with past values at various lags.'
    },
    {
      text: 'What is the difference between ARIMA and SARIMA?',
      options: [
        'SARIMA includes seasonal components',
        'ARIMA is for classification, SARIMA for regression',
        'SARIMA is faster',
        'No difference'
      ],
      correctIndex: 0,
      explanation: 'SARIMA extends ARIMA with seasonal AR, I, and MA components: SARIMA(p,d,q)(P,D,Q)ₛ.'
    },
    {
      text: 'What is Prophet (by Facebook)?',
      options: [
        'Time series forecasting tool handling seasonality and holidays',
        'A classification algorithm',
        'A data visualization library',
        'A database system'
      ],
      correctIndex: 0,
      explanation: 'Prophet is designed for business forecasting with strong seasonality and holiday effects.'
    },
    {
      text: 'What type of neural network is commonly used for time series?',
      options: [
        'LSTM (Long Short-Term Memory)',
        'Convolutional Neural Networks',
        'Autoencoders',
        'GANs'
      ],
      correctIndex: 0,
      explanation: 'LSTMs capture long-term dependencies in sequential data, ideal for time series.'
    },
    {
      text: 'What is a rolling window forecast?',
      options: [
        'Using a fixed window of past observations to predict next value',
        'Forecasting all future values at once',
        'Using the entire history',
        'Random sampling of observations'
      ],
      correctIndex: 0,
      explanation: 'Rolling window maintains fixed-size history, updating as new data arrives.'
    },
  ],

  'Model Evaluation & Validation': [
    {
      text: 'What is the confusion matrix used for?',
      options: [
        'Evaluating classification model performance',
        'Selecting features',
        'Normalizing data',
        'Training the model'
      ],
      correctIndex: 0,
      explanation: 'Confusion matrix shows TP, TN, FP, FN counts for evaluating classification accuracy.'
    },
    {
      text: 'What is precision in classification?',
      options: [
        'TP / (TP + FP) - proportion of positive predictions that are correct',
        'TP / (TP + FN) - proportion of actual positives identified',
        'Accuracy of the model',
        'Total correct predictions'
      ],
      correctIndex: 0,
      explanation: 'Precision = TP/(TP+FP) measures how many predicted positives are actually positive.'
    },
    {
      text: 'What is recall (sensitivity)?',
      options: [
        'TP / (TP + FN) - proportion of actual positives correctly identified',
        'TP / (TP + FP) - proportion of positive predictions that are correct',
        'TN / (TN + FP)',
        'Overall accuracy'
      ],
      correctIndex: 0,
      explanation: 'Recall = TP/(TP+FN) measures how many actual positives are detected.'
    },
    {
      text: 'What is the F1-score?',
      options: [
        'Harmonic mean of precision and recall',
        'Average of precision and recall',
        'Product of precision and recall',
        'Difference between precision and recall'
      ],
      correctIndex: 0,
      explanation: 'F1 = 2 * (precision * recall) / (precision + recall), balances both metrics.'
    },
    {
      text: 'What is k-fold cross-validation?',
      options: [
        'Split data into k parts, train on k-1, validate on 1, repeat k times',
        'Train k different models',
        'Use k different features',
        'Run the model k times on same data'
      ],
      correctIndex: 0,
      explanation: 'K-fold CV rotates which fold is validation set, averaging results for robust estimate.'
    },
    {
      text: 'What is the ROC curve?',
      options: [
        'Plot of True Positive Rate vs False Positive Rate at various thresholds',
        'Plot of accuracy vs threshold',
        'Plot of precision vs recall',
        'Plot of training vs validation error'
      ],
      correctIndex: 0,
      explanation: 'ROC curve visualizes classifier performance across decision thresholds; AUC summarizes it.'
    },
    {
      text: 'What does AUC (Area Under Curve) measure?',
      options: [
        'Overall ability of model to discriminate between classes',
        'Accuracy of the model',
        'Training time',
        'Number of features'
      ],
      correctIndex: 0,
      explanation: 'AUC ranges from 0 to 1; 0.5 = random, 1.0 = perfect classifier.'
    },
    {
      text: 'What is stratified sampling in train-test split?',
      options: [
        'Maintaining class proportions in both train and test sets',
        'Random splitting without consideration of classes',
        'Taking every nth sample',
        'Using the entire dataset for training'
      ],
      correctIndex: 0,
      explanation: 'Stratified split ensures each class is represented proportionally in train and test sets.'
    },
    {
      text: 'What is the bias-variance tradeoff?',
      options: [
        'Balance between model simplicity (high bias) and complexity (high variance)',
        'Tradeoff between training and testing time',
        'Choosing between different algorithms',
        'Selecting features vs. samples'
      ],
      correctIndex: 0,
      explanation: 'High bias = underfitting (too simple), high variance = overfitting (too complex).'
    },
    {
      text: 'What is RMSE (Root Mean Squared Error)?',
      options: [
        'Square root of average squared prediction errors',
        'Average of absolute errors',
        'Percentage error',
        'Correlation coefficient'
      ],
      correctIndex: 0,
      explanation: 'RMSE = √(MSE) = √((1/n)∑(yᵢ - ŷᵢ)²), penalizes large errors more than MAE.'
    },
  ],

  'Ensemble Methods': [
    {
      text: 'What is ensemble learning?',
      options: [
        'Combining multiple models to improve overall performance',
        'Training one very complex model',
        'Using multiple features',
        'Parallel processing'
      ],
      correctIndex: 0,
      explanation: 'Ensemble methods combine predictions from multiple models to reduce variance and improve accuracy.'
    },
    {
      text: 'What is bagging (Bootstrap Aggregating)?',
      options: [
        'Training multiple models on bootstrapped samples and averaging predictions',
        'Sequential training of models',
        'Selecting the best single model',
        'Combining different algorithms'
      ],
      correctIndex: 0,
      explanation: 'Bagging reduces variance by training on random subsets with replacement and averaging results.'
    },
    {
      text: 'What is Random Forest?',
      options: [
        'Ensemble of decision trees with random feature selection',
        'Single deep decision tree',
        'Forest of neural networks',
        'Clustering algorithm'
      ],
      correctIndex: 0,
      explanation: 'Random Forest uses bagging + random feature subsets at each split to decorrelate trees.'
    },
    {
      text: 'What is boosting?',
      options: [
        'Sequential training where each model corrects previous errors',
        'Parallel training of independent models',
        'Training one model multiple times',
        'Increasing learning rate over time'
      ],
      correctIndex: 0,
      explanation: 'Boosting (AdaBoost, Gradient Boosting) builds models sequentially, focusing on hard examples.'
    },
    {
      text: 'What is Gradient Boosting?',
      options: [
        'Boosting method that optimizes loss function using gradient descent',
        'Random forest variant',
        'Neural network training method',
        'Feature selection technique'
      ],
      correctIndex: 0,
      explanation: 'Gradient Boosting fits each tree to residuals (negative gradient of loss) from previous trees.'
    },
    {
      text: 'What is XGBoost?',
      options: [
        'Optimized implementation of gradient boosting with regularization',
        'Extra trees ensemble',
        'Neural network architecture',
        'Clustering algorithm'
      ],
      correctIndex: 0,
      explanation: 'XGBoost adds regularization, handles missing values, and is highly efficient.'
    },
    {
      text: 'What is stacking in ensemble methods?',
      options: [
        'Training a meta-model on predictions from base models',
        'Stacking data layers',
        'Adding more layers to neural network',
        'Combining features'
      ],
      correctIndex: 0,
      explanation: 'Stacking uses base model predictions as features for a higher-level meta-learner.'
    },
    {
      text: 'What is the main advantage of Random Forest over single decision tree?',
      options: [
        'Reduced overfitting and better generalization',
        'Faster training',
        'Easier to interpret',
        'Uses less memory'
      ],
      correctIndex: 0,
      explanation: 'Multiple trees with randomness reduce variance and overfitting compared to single tree.'
    },
    {
      text: 'Which is typically better for structured/tabular data?',
      options: [
        'Gradient Boosting (XGBoost, LightGBM)',
        'Convolutional Neural Networks',
        'Recurrent Neural Networks',
        'GANs'
      ],
      correctIndex: 0,
      explanation: 'Gradient boosting methods often outperform deep learning on structured/tabular data.'
    },
    {
      text: 'What is out-of-bag (OOB) error in Random Forest?',
      options: [
        'Error estimated on samples not used in training each tree',
        'Test set error',
        'Training error',
        'Validation error'
      ],
      correctIndex: 0,
      explanation: 'OOB error uses bootstrap samples not selected for each tree as validation set.'
    },
  ],

  'Applications of Predictive Analytics': [
    {
      text: 'What is a common application of predictive analytics in retail?',
      options: [
        'Customer churn prediction and demand forecasting',
        'Network routing',
        'Image recognition',
        'Natural language translation'
      ],
      correctIndex: 0,
      explanation: 'Retailers use predictive models for churn, demand forecasting, recommendation systems.'
    },
    {
      text: 'What is credit scoring in finance?',
      options: [
        'Predicting likelihood of loan default',
        'Counting credit cards',
        'Calculating interest rates',
        'Managing bank accounts'
      ],
      correctIndex: 0,
      explanation: 'Credit scoring models predict default probability based on applicant features and history.'
    },
    {
      text: 'What is predictive maintenance?',
      options: [
        'Predicting equipment failure before it happens',
        'Scheduled regular maintenance',
        'Fixing equipment after failure',
        'Cleaning equipment'
      ],
      correctIndex: 0,
      explanation: 'Predictive maintenance uses sensor data and ML to predict failures and optimize maintenance timing.'
    },
    {
      text: 'What is A/B testing used for?',
      options: [
        'Comparing performance of two variants to inform decisions',
        'Grading student performance',
        'Testing hardware',
        'Data validation'
      ],
      correctIndex: 0,
      explanation: 'A/B testing randomly assigns users to variants and measures which performs better.'
    },
    {
      text: 'What is a recommendation system?',
      options: [
        'System that predicts user preferences and suggests items',
        'System that recommends features to use',
        'Algorithm selection tool',
        'Data preprocessing pipeline'
      ],
      correctIndex: 0,
      explanation: 'Recommendation systems (collaborative filtering, content-based) predict what users might like.'
    },
    {
      text: 'What is sentiment analysis?',
      options: [
        'Determining emotional tone of text (positive/negative/neutral)',
        'Analyzing stock market trends',
        'Customer segmentation',
        'Time series forecasting'
      ],
      correctIndex: 0,
      explanation: 'Sentiment analysis uses NLP and ML to classify text sentiment for business insights.'
    },
    {
      text: 'What is fraud detection in banking?',
      options: [
        'Identifying unusual patterns indicating fraudulent transactions',
        'Counting money',
        'Customer service',
        'Interest calculation'
      ],
      correctIndex: 0,
      explanation: 'Fraud detection models flag suspicious transactions based on historical fraud patterns.'
    },
    {
      text: 'What is customer lifetime value (CLV) prediction?',
      options: [
        'Estimating total revenue a customer will generate over relationship',
        'Current purchase value',
        'Number of purchases',
        'Customer age'
      ],
      correctIndex: 0,
      explanation: 'CLV prediction helps prioritize high-value customers and optimize marketing spend.'
    },
    {
      text: 'What is price optimization?',
      options: [
        'Using predictive models to set prices maximizing revenue/profit',
        'Always choosing lowest price',
        'Fixed pricing strategy',
        'Random pricing'
      ],
      correctIndex: 0,
      explanation: 'Price optimization models consider demand elasticity, competition, and customer segments.'
    },
    {
      text: 'What is disease prediction in healthcare?',
      options: [
        'Predicting disease risk based on patient data and history',
        'Diagnosing current diseases',
        'Treating patients',
        'Hospital administration'
      ],
      correctIndex: 0,
      explanation: 'Predictive models identify high-risk patients for early intervention using medical records, genetics, lifestyle.'
    },
  ],
};

async function main() {
  console.log('🚀 Starting Predictive Analytics Question Generation...\n');

  // Step 1: Delete all existing Project Management questions
  console.log('🗑️  Deleting all Project Management questions...');

  const pmCell = await prisma.cell.findFirst({
    where: {
      OR: [
        { name: { contains: 'Project Management' } },
        { name: { contains: 'project management' } },
      ]
    }
  });

  if (pmCell) {
    const deletedQuestions = await prisma.question.deleteMany({
      where: { cellId: pmCell.id }
    });

    const deletedCell = await prisma.cell.delete({
      where: { id: pmCell.id }
    });

    console.log(`   ✅ Deleted ${deletedQuestions.count} Project Management questions`);
    console.log(`   ✅ Deleted Project Management cell\n`);
  } else {
    console.log('   ℹ️  No Project Management questions found\n');
  }

  // Step 2: Create new Predictive Analytics topic cells
  console.log('📊 Creating Predictive Analytics topic cells...\n');

  const cells = [];
  for (const topic of TOPICS) {
    const cell = await prisma.cell.create({
      data: {
        name: topic.name,
        difficulty_b: 0.0, // Neutral baseline
        discrimination_a: 1.2, // Good discrimination
      },
    });
    cells.push({ ...cell, weight: topic.weight });
    console.log(`   ✅ Created: ${topic.name} (weight: ${(topic.weight * 100).toFixed(0)}%)`);
  }

  console.log('\n📝 Generating 500 questions with Gaussian difficulty distribution...\n');

  // Step 3: Generate questions with proper distribution
  let questionCount = 0;
  const totalQuestions = 500;

  for (const cell of cells) {
    const numQuestions = Math.round(totalQuestions * cell.weight);
    const topicName = cell.name;
    const templates = QUESTION_BANK[topicName as keyof typeof QUESTION_BANK] || [];

    console.log(`\n📚 Generating ${numQuestions} questions for: ${topicName}`);

    for (let i = 0; i < numQuestions; i++) {
      // Select template (cycle through available templates)
      const template = templates[i % templates.length];

      // Generate IRT parameters
      const difficulty_b = generateDifficulty();
      const discrimination_a = generateDiscrimination();
      const guessing_c = generateGuessing();

      // Create question
      const question = await prisma.question.create({
        data: {
          text: template.text,
          explanation: template.explanation,
          cellId: cell.id,
          difficulty_b,
          discrimination_a,
          guessing_c,
          irtModel: '3PL',
          isActive: true,
        },
      });

      // Create answer options
      for (let j = 0; j < template.options.length; j++) {
        await prisma.answerOption.create({
          data: {
            text: template.options[j],
            isCorrect: j === template.correctIndex,
            questionId: question.id,
          },
        });
      }

      questionCount++;

      if (questionCount % 50 === 0) {
        console.log(`   ✅ Generated ${questionCount}/${totalQuestions} questions...`);
      }
    }
  }

  console.log(`\n✨ Successfully generated ${questionCount} Predictive Analytics questions!\n`);

  // Step 4: Display statistics
  console.log('📊 Question Distribution by Topic:');
  for (const cell of cells) {
    const count = await prisma.question.count({
      where: { cellId: cell.id }
    });
    console.log(`   ${cell.name}: ${count} questions (${((count/totalQuestions)*100).toFixed(1)}%)`);
  }

  console.log('\n📈 Difficulty Distribution Statistics:');
  const allQuestions = await prisma.question.findMany({
    where: {
      cellId: { in: cells.map(c => c.id) }
    },
    select: { difficulty_b: true }
  });

  const difficulties = allQuestions.map(q => q.difficulty_b);
  const mean = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
  const variance = difficulties.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / difficulties.length;
  const std = Math.sqrt(variance);

  console.log(`   Mean difficulty: ${mean.toFixed(3)}`);
  console.log(`   Std deviation: ${std.toFixed(3)}`);
  console.log(`   Min difficulty: ${Math.min(...difficulties).toFixed(3)}`);
  console.log(`   Max difficulty: ${Math.max(...difficulties).toFixed(3)}`);

  // Difficulty ranges
  const veryEasy = difficulties.filter(d => d < -1.5).length;
  const easy = difficulties.filter(d => d >= -1.5 && d < -0.5).length;
  const medium = difficulties.filter(d => d >= -0.5 && d < 0.5).length;
  const hard = difficulties.filter(d => d >= 0.5 && d < 1.5).length;
  const veryHard = difficulties.filter(d => d >= 1.5).length;

  console.log('\n📊 Difficulty Categories:');
  console.log(`   Very Easy (< -1.5): ${veryEasy} (${((veryEasy/totalQuestions)*100).toFixed(1)}%)`);
  console.log(`   Easy (-1.5 to -0.5): ${easy} (${((easy/totalQuestions)*100).toFixed(1)}%)`);
  console.log(`   Medium (-0.5 to 0.5): ${medium} (${((medium/totalQuestions)*100).toFixed(1)}%)`);
  console.log(`   Hard (0.5 to 1.5): ${hard} (${((hard/totalQuestions)*100).toFixed(1)}%)`);
  console.log(`   Very Hard (> 1.5): ${veryHard} (${((veryHard/totalQuestions)*100).toFixed(1)}%)`);

  console.log('\n🎉 Question generation complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

# Internal Code Documentation: Model Recommendation System

## Table of Contents

* [1. Introduction](#introduction)
* [2. `load_and_preprocess_data` Function](#load_and_preprocess_data-function)
* [3. `predict_model` Function](#predict_model-function)
* [4. `map_user_input_to_normalized` Function](#map_user_input_to_normalized-function)


<a name="introduction"></a>
## 1. Introduction

This document details the Python code for a model recommendation system.  The system takes user preferences for cost, performance, and latency as input and recommends the top three most similar models based on these criteria.  The system utilizes the `pandas` library for data manipulation, `scikit-learn` for data preprocessing and distance calculations, and employs a Euclidean distance-based similarity measure.

<a name="load_and_preprocess_data-function"></a>
## 2. `load_and_preprocess_data` Function

This function loads data from a CSV file, preprocesses it, and returns a dictionary containing a preprocessed DataFrame and input/output cost information.

| Step | Description | Details |
|---|---|---|
| Data Loading | Loads data from specified CSV file path. | Uses `pd.read_csv()` |
| Header Row Handling | Treats the first row as the header. | Sets `df.columns = df.iloc[0]` and then slices the DataFrame to remove the header row (`df = df[1:]`) |
| Input/Output Cost Extraction | Extracts 'InputCost' and 'OutputCost' from respective columns. | Cleans the columns using `.replace()` to remove '$' and ',' characters, then converts to float. |
| Column Dropping | Removes irrelevant columns. | Uses `.drop()` to remove specified columns.  Additionally removes rows at specific indices. |
| Data Cleaning | Converts specific columns to numeric and handles missing values (NaNs). | Uses `pd.to_numeric()` with `errors='coerce'` to handle non-numeric values. Replaces NaNs with the mean of the column, rounded to 2 decimal places.  For 'Chatbot Arena', the mean is used without rounding, and then converted to integer. |
| Normalization | Normalizes relevant columns using `MinMaxScaler`. | Applies `MinMaxScaler` to 'Index Normalized avg', 'Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval', 'Blended USD/1M Tokens', and 'Median First Chunk (s)', scaling values to the range [0,1]. Rounds the results to 3 decimal places. |
| Column Renaming | Renames columns for better readability. | Renames 'Blended USD/1M Tokens' to 'Cost' and 'Median First Chunk (s)' to 'latency'. |
| Performance Average Calculation | Computes the average performance across multiple metrics. | Calculates the mean of 'Index Normalized avg', 'Chatbot Arena', 'MMLU', 'MT Bench', and 'HumanEval' for each model. |
| Data Storage and Return | Stores the preprocessed DataFrame and input/output cost information in a dictionary. | Returns a dictionary with keys 'preprocessed_df' and 'input_output_costs' containing the respective data. |

<a name="predict_model-function"></a>
## 3. `predict_model` Function

This function takes user input and preprocessed data to predict the top three most similar models.

| Step | Description | Details | Algorithm |
|---|---|---|---|
| Data Access | Accesses preprocessed DataFrame and input/output costs from the input dictionary. |  Retrieves 'preprocessed_df' and 'input_output_costs'.  The rows removed in `load_and_preprocess_data` are also dropped here. | N/A |
| Feature Selection | Selects features for comparison. | Uses 'Cost', 'Performance', and 'latency' columns from the preprocessed DataFrame. | N/A |
| User Input Normalization | Normalizes user input using `map_user_input_to_normalized`. | Maps user input values (assumed to be in the range [0,1]) to the normalized range of the corresponding columns in the DataFrame.  | Uses linear scaling to map user input to normalized data range.  |
| User Input DataFrame Creation | Creates a Pandas DataFrame from the normalized user input. | Converts the normalized user input dictionary into a DataFrame. | N/A |
| Similarity Calculation | Computes Euclidean distance between the user input and each model's features. | Uses `euclidean_distances` from `sklearn.metrics.pairwise` to calculate distances.  | Euclidean distance formula: √[(x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²]  where x,y,z represent Cost, Performance, and Latency respectively. |
| Similarity Column Addition | Adds a 'Similarity' column to the DataFrame containing the calculated distances. | Adds a column to the DataFrame with the calculated Euclidean distances. | N/A |
| Column Dropping | Removes unnecessary columns from the DataFrame.  | Removes columns that are not needed for the final output. | N/A |
| Top 3 Model Selection | Selects the top three models with the lowest Euclidean distances (highest similarity). | Uses `.nsmallest(3, 'Similarity')` to select the three models with the smallest similarity scores (closest to the user input). | N/A |
| Result Compilation | Creates a final DataFrame with model recommendations. | Generates a DataFrame containing the top three models, their similarity scores, and their input and output costs. | N/A |
| Return Value | Returns a DataFrame containing the top 3 models, their similarity scores, and input/output costs. |  Returns a Pandas DataFrame. | N/A |


<a name="map_user_input_to_normalized-function"></a>
## 4. `map_user_input_to_normalized` Function

This function maps a user input value (assumed to be between 0 and 1) to the corresponding normalized value range of a specific column in a DataFrame.

The function performs a linear mapping using the formula:

`normalized_value = min_val + user_input * (max_val - min_val)`

where:

* `user_input` is the user-provided value (between 0 and 1).
* `min_val` is the minimum value of the column in the DataFrame.
* `max_val` is the maximum value of the column in the DataFrame.
* `normalized_value` is the mapped normalized value.

This ensures that the user input is consistent with the normalized scale of the data.

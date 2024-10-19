import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import euclidean_distances

import sys
sys.path.append("../../../app/")


# Function to load and preprocess the data
def load_and_preprocess_data(file_path: str):
    print(file_path)
    df = pd.read_csv(file_path)
    df.columns = df.iloc[0]
    df = df[1:]
    
    # Extract Input and Output cost before dropping columns
    df['InputCost'] = df['Input Price\nUSD/1M Tokens'].replace('[\$,]', '', regex=True).astype(float)
    df['OutputCost'] = df['Output Price\nUSD/1M Tokens'].replace('[\$,]', '', regex=True).astype(float)

    mdf = df.drop(columns=['Creator', 'License','Context\nWindow','Further\nAnalysis','Median\nTokens/s',
                           'P5\nTokens/s', 'P25\nTokens/s', 'P75\nTokens/s', 'P95\nTokens/s',
                           'P5\nFirst Chunk (s)', 'P25\nFirst Chunk (s)', 'P75\nFirst Chunk (s)',
                           'P95\nFirst Chunk (s)','InputCost','OutputCost'])
    print(mdf)
    mdf = mdf.drop([23,24,39,40,43,44,46,52,57,58])
    
    # Convert relevant columns to numeric and fill NaNs
    mdf[['Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval']] = mdf[['Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval']].apply(pd.to_numeric, errors='coerce')
    mdf[['Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval']] = mdf[['Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval']].fillna(mdf[['Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval']].mean().round(2))
    mdf['Chatbot Arena'] = mdf['Chatbot Arena'].fillna(mdf['Chatbot Arena'].mean()).astype(int)

    # Normalize performance columns
    performance_columns = ['Index\nNormalized avg', 'Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval']
    scaler = MinMaxScaler(feature_range=(0, 1))
    mdf[performance_columns] = scaler.fit_transform(mdf[performance_columns]).round(3)

    # Normalize cost and latency columns
    mdf['Blended\nUSD/1M Tokens'] = mdf['Blended\nUSD/1M Tokens'].replace('[\$,]', '', regex=True).astype(float)
    mdf['Blended\nUSD/1M Tokens'] = scaler.fit_transform(mdf[['Blended\nUSD/1M Tokens']]).round(3)
    mdf['Median\nFirst Chunk (s)'] = scaler.fit_transform(mdf[['Median\nFirst Chunk (s)']]).round(3)
    
    # Rename columns for better readability
    mdf = mdf.rename(columns={"Blended\nUSD/1M Tokens": "Cost", "Median\nFirst Chunk (s)": "latency"})
    
    # Compute performance average
    mdf['Performance'] = mdf[['Index\nNormalized avg', 'Chatbot Arena', 'MMLU', 'MT Bench', 'HumanEval']].mean(axis=1)

    # Store preprocessed dataframe and input-output cost information
    processed_data = {
        'preprocessed_df': mdf,
        'input_output_costs': df[['Model', 'InputCost', 'OutputCost']]
    }

    return processed_data

# Function to perform prediction
def predict_model(user_input, preprocessed_data):
    # Access preprocessed dataframe and input-output costs
    mdf = preprocessed_data['preprocessed_df']
    input_output_costs = preprocessed_data['input_output_costs']
    
    input_output_costs = input_output_costs.drop([23,24,39,40,43,44,46,52,57,58])
    
    # Features to compare
    features = mdf[['Cost', 'Performance', 'latency']]
    user_input_normalized = {
    'Cost': map_user_input_to_normalized(user_input['Cost'], mdf, 'Cost'),
    'Performance': map_user_input_to_normalized(user_input['Performance'], mdf, 'Performance'),
    'latency': map_user_input_to_normalized(user_input['latency'], mdf, 'latency')
    }
    # Convert user input to DataFrame
    user_input_df = pd.DataFrame([user_input_normalized], columns=['Cost', 'Performance', 'latency'])

    # Compute similarity using Euclidean distance
    distances = euclidean_distances(user_input_df, features)
    mdf['Similarity'] = distances[0]
    mdf = mdf.drop(columns=["Index\nNormalized avg", "Chatbot Arena", "MMLU", "MT Bench", "HumanEval","Input Price\nUSD/1M Tokens","Output Price\nUSD/1M Tokens"])
    print(mdf)
    # Get top 3 models based on similarity
    top_3_models = mdf.nsmallest(3, 'Similarity')
    # top_3_models = top_3_models.drop(columns=["Index\nNormalized avg", "Chatbot Arena", "MMLU", "MT Bench", "HumanEval"])
    # print(mdf['Model','Cost','Performance','latency'])
    final_df = pd.DataFrame({
    'Model': top_3_models['Model'],
    'Similarity': top_3_models['Similarity'],
    'InputCost': top_3_models['Model'].apply(lambda model: input_output_costs[input_output_costs['Model'] == model]['InputCost'].values[0]),
    'OutputCost': top_3_models['Model'].apply(lambda model: input_output_costs[input_output_costs['Model'] == model]['OutputCost'].values[0])
    })    
    return final_df



def map_user_input_to_normalized(user_input, df, column_name):
    """
    Map a user input value between 0 and 1 to the corresponding normalized value range.
    
    :param user_input: User input value between 0 and 1.
    :param df: DataFrame containing normalized values for the column.
    :param column_name: Column name to map the value to.
    :return: Mapped normalized value.
    """
    min_val = df[column_name].min()
    max_val = df[column_name].max()
    return min_val + user_input * (max_val - min_val)


#pre = load_and_preprocess_data("model_info/models_2024_aug.csv")

'''
user_input = {
    'Cost': 0.1,           # User input between 0 and 1
    'Performance': 0.8,    # User input between 0 and 1
    'latency': 1         # User input between 0 and 1
}



p = predict_model(user_input,pre)
print(p)
'''